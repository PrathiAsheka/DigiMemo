import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProperty } from "@/lib/auth";
import { db } from "@/lib/db";
import { ASSET_CATEGORIES, DOCUMENT_KINDS } from "@/lib/constants";
import { addDays, startOfDayUTC, toDateInput } from "@/lib/format";
import { aiConfigured } from "@/lib/ai/client";
import { canExtract, ExtractionSchema, type Extraction } from "@/lib/ai/extract";
import { Field, Hidden, Select } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { getT } from "@/i18n/server";
import type { Translator } from "@/i18n/translator";
import { confirmExtraction, deleteDocument, linkDocument } from "../../../document-actions";
import { ExtractionRunner } from "./extraction-runner";

type Conf = "high" | "medium" | "low";

function ConfidenceHint({ t, confidence }: { t: Translator; confidence: Conf }) {
  if (confidence === "high") return null;
  return (
    <span className={`ml-1 text-[11px] font-normal ${confidence === "low" ? "text-danger" : "text-warn"}`}>
      {confidence === "low" ? t("review.notFound") : t("review.pleaseConfirm")}
    </span>
  );
}

/** A review input highlighted when the AI was unsure (proposal §20: confirm uncertain fields). */
function ReviewInput({
  t,
  name,
  text,
  value,
  confidence,
  type = "text",
}: {
  t: Translator;
  name: string;
  text: string;
  value: string | number | null;
  confidence: Conf;
  type?: string;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={name}>
        {text}
        <ConfidenceHint t={t} confidence={confidence} />
      </label>
      <input
        id={name}
        name={name}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        defaultValue={value ?? ""}
        className={`input ${confidence === "high" ? "" : confidence === "medium" ? "border-warn/60" : "border-danger/40"}`}
      />
    </div>
  );
}

function isoOrEmpty(v: string | null) {
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "";
}

export default async function DocumentPage({ params }: PageProps<"/properties/[id]/documents/[docId]">) {
  const { id, docId } = await params;
  const [{ property }, t] = await Promise.all([requireProperty(id), getT()]);

  const doc = await db.document.findFirst({
    where: { id: docId, propertyId: property.id },
    include: { asset: { select: { id: true, name: true } } },
  });
  if (!doc) notFound();

  const [assets, spaces] = await Promise.all([
    db.asset.findMany({ where: { propertyId: property.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.space.findMany({ where: { propertyId: property.id }, orderBy: { name: "asc" } }),
  ]);

  let extraction: Extraction | null = null;
  if (doc.extraction) {
    const parsed = ExtractionSchema.safeParse(JSON.parse(doc.extraction));
    extraction = parsed.success ? parsed.data : null;
  }

  const fileUrl = `/api/documents/${doc.id}`;
  const isImage = doc.mimeType.startsWith("image/");
  const assetOptions = assets.map((a) => ({ value: a.id, label: a.name }));
  const today = startOfDayUTC(new Date());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/properties/${property.id}/documents`} className="text-xs text-muted hover:underline">← {t("tabs.documents")}</Link>
          <h2 className="mt-1 text-xl font-semibold">{doc.filename}</h2>
          <p className="mt-1 text-sm text-muted">
            {t.label(doc.kind)} · {t("review.uploaded", { date: t.date(doc.createdAt) })} · {(doc.sizeBytes / 1024).toFixed(0)} KB
            {doc.asset && <> · {t("review.linkedTo")} <Link className="hover:underline" href={`/properties/${property.id}/assets/${doc.asset.id}`}>{doc.asset.name}</Link></>}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <a href={fileUrl} target="_blank" className="btn-secondary">{t("review.openFile")}</a>
          <form action={deleteDocument}>
            <Hidden name="documentId" value={doc.id} />
            <ConfirmButton message={t("review.deleteConfirm", { name: doc.filename })}>{t("common.delete")}</ConfirmButton>
          </form>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="card self-start overflow-hidden p-0">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl} alt={doc.filename} className="w-full" />
          ) : doc.mimeType === "application/pdf" ? (
            <iframe src={fileUrl} title={doc.filename} className="h-[640px] w-full" />
          ) : (
            <p className="p-5 text-sm text-muted">{t("review.noPreview")}</p>
          )}
        </div>

        <div className="space-y-4">
          {doc.extractionStatus === "pending" && (
            <div className="card"><ExtractionRunner documentId={doc.id} autoStart /></div>
          )}

          {doc.extractionStatus === "failed" && (
            <div className="card space-y-2">
              <p className="text-sm text-danger">{doc.extractionError ?? t("documents.extractionFailed")}</p>
              <ExtractionRunner documentId={doc.id} autoStart={false} />
            </div>
          )}

          {doc.extractionStatus === "none" && canExtract(doc.mimeType) && aiConfigured() && (
            <div className="card space-y-2">
              <p className="text-sm text-muted">{t("review.letAiRead")}</p>
              <ExtractionRunner documentId={doc.id} autoStart={false} />
            </div>
          )}

          {doc.extractionStatus === "ready" && extraction && (
            <form action={confirmExtraction} className="card space-y-5">
              <div>
                <h2 className="h2">{t("review.title")}</h2>
                <p className="mt-1 text-sm text-muted">{extraction.summary}</p>
                <p className="mt-2 text-xs text-muted">{t("review.highlighted")}</p>
              </div>
              {extraction.warnings.length > 0 && (
                <ul className="list-disc space-y-1 rounded-lg border border-warn/40 py-2 pl-8 pr-3 text-sm text-warn">
                  {extraction.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              )}
              <Hidden name="documentId" value={doc.id} />
              <Hidden name="currency" value={extraction.currency ?? "USD"} />
              <Hidden name="vendor" value={extraction.vendor.value ?? ""} />

              <fieldset className="space-y-3">
                <legend className="text-sm font-medium">{t("common.equipment")}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t("review.saveTo")} name="target">
                    <Select name="target" options={[{ value: "new", label: t("review.createNew") }, ...assetOptions]} defaultValue={doc.assetId ?? "new"} other={false} />
                  </Field>
                  <Field label={t("assets.space")} name="spaceId">
                    <Select name="spaceId" emptyLabel={t("common.notAssignedOption")} options={spaces.map((s) => ({ value: s.id, label: s.name }))} otherPlaceholder={t("common.newRoomName")} />
                  </Field>
                  <ReviewInput t={t} name="name" text={t("common.name")} value={extraction.asset.name.value} confidence={extraction.asset.name.confidence} />
                  <div>
                    <label className="field-label" htmlFor="category">
                      {t("common.category")} <ConfidenceHint t={t} confidence={extraction.asset.category.confidence} />
                    </label>
                    <Select name="category" options={ASSET_CATEGORIES} defaultValue={extraction.asset.category.value ?? "other"} />
                  </div>
                  <ReviewInput t={t} name="manufacturer" text={t("assets.manufacturer")} value={extraction.asset.manufacturer.value} confidence={extraction.asset.manufacturer.confidence} />
                  <ReviewInput t={t} name="model" text={t("assets.model")} value={extraction.asset.model.value} confidence={extraction.asset.model.confidence} />
                  <ReviewInput t={t} name="serialNumber" text={t("assets.serialNumber")} value={extraction.asset.serialNumber.value} confidence={extraction.asset.serialNumber.confidence} />
                  <ReviewInput t={t} name="purchaseDate" text={t("assets.purchaseDate")} type="date" value={isoOrEmpty(extraction.purchaseDate.value)} confidence={extraction.purchaseDate.confidence} />
                  <ReviewInput t={t} name="purchasePrice" text={t("review.price", { currency: extraction.currency ?? "USD" })} type="number" value={extraction.purchasePrice.value} confidence={extraction.purchasePrice.confidence} />
                </div>
                {extraction.purchasePrice.value != null && (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="createPurchaseCost" defaultChecked /> {t("review.recordPurchase")}
                  </label>
                )}
              </fieldset>

              <fieldset className="space-y-3 border-t border-border pt-4">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" name="createWarranty" defaultChecked={!!extraction.warranty.endDate.value} /> {t("assets.addWarranty")}
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <ReviewInput t={t} name="warrantyEnd" text={t("assets.ends")} type="date" value={isoOrEmpty(extraction.warranty.endDate.value)} confidence={extraction.warranty.endDate.confidence} />
                  <ReviewInput t={t} name="warrantyProvider" text={t("common.provider")} value={extraction.warranty.provider.value} confidence={extraction.warranty.provider.confidence} />
                  <ReviewInput t={t} name="warrantyTerms" text={t("assets.terms")} value={extraction.warranty.terms.value} confidence={extraction.warranty.terms.confidence} />
                </div>
              </fieldset>

              {extraction.service.isServiceRecord && (
                <fieldset className="space-y-3 border-t border-border pt-4">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" name="createService" defaultChecked /> {t("review.addService")}
                  </label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <ReviewInput t={t} name="serviceDate" text={t("common.date")} type="date" value={isoOrEmpty(extraction.service.date.value)} confidence={extraction.service.date.confidence} />
                    <ReviewInput t={t} name="serviceDescription" text={t("review.workDone")} value={extraction.service.description.value} confidence={extraction.service.description.confidence} />
                    <ReviewInput t={t} name="serviceCost" text={t("workOrders.cost")} type="number" value={extraction.service.cost.value} confidence={extraction.service.cost.confidence} />
                  </div>
                </fieldset>
              )}

              {extraction.suggestedMaintenance.length > 0 && (
                <fieldset className="space-y-2 border-t border-border pt-4">
                  <legend className="text-sm font-medium">{t("review.suggestedMaintenance")}</legend>
                  <Hidden name="taskCount" value={String(extraction.suggestedMaintenance.length)} />
                  {extraction.suggestedMaintenance.map((task, i) => (
                    <div key={i} className="grid items-center gap-2 sm:grid-cols-[auto_1fr_110px_150px]">
                      <input type="checkbox" name={`task_${i}`} defaultChecked={task.source === "document"} aria-label={t("review.scheduleTask", { title: task.title })} />
                      <input name={`task_title_${i}`} defaultValue={task.title} className="input" aria-label={t("tasks.task")} />
                      <input name={`task_interval_${i}`} type="number" min={1} defaultValue={task.intervalDays ?? ""} placeholder={t("review.days")} className="input" aria-label={t("tasks.repeatEveryDays")} />
                      <input name={`task_due_${i}`} type="date" defaultValue={toDateInput(addDays(today, Math.min(task.intervalDays ?? 7, 30)))} className="input" aria-label={t("review.firstDue")} />
                      {task.source === "general_guidance" && <span className="text-xs text-muted sm:col-start-2 sm:col-end-5">{t("review.generalGuidance")}</span>}
                    </div>
                  ))}
                  <p className="text-xs text-muted">{t("review.columns")}</p>
                </fieldset>
              )}

              <button className="btn">{t("review.confirm")}</button>
            </form>
          )}

          {(doc.extractionStatus === "confirmed" || doc.extractionStatus === "none" || doc.extractionStatus === "failed") && (
            <form action={linkDocument} className="card space-y-3">
              <h2 className="h2">{t("common.details")}</h2>
              <Hidden name="documentId" value={doc.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("common.type")} name="kind"><Select name="kind" options={DOCUMENT_KINDS} defaultValue={doc.kind} /></Field>
                <Field label={t("review.linkedEquipment")} name="assetId"><Select name="assetId" emptyLabel={t("common.noneOption")} options={assetOptions} defaultValue={doc.assetId} otherPlaceholder={t("common.newEquipmentName")} /></Field>
              </div>
              <button className="btn-secondary">{t("common.save")}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
