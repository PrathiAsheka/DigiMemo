import { createProperty } from "../actions";
import { PropertyFields } from "../property-fields";

export default function NewPropertyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="h1">Add a property</h1>
      <form action={createProperty} className="card space-y-5">
        <PropertyFields />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="seedSpaces" defaultChecked />
          Start with typical rooms (kitchen, living room, bedroom…)
        </label>
        <button className="btn">Create property</button>
      </form>
    </div>
  );
}
