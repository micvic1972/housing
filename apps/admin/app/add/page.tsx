import ListingForm from "../../components/listings-form";

export default function AddListingPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-primary">UniNest admin</p>
        <h1 className="text-3xl font-bold tracking-tight">Add a place</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Add the listing details and photos students need to make an informed
          choice.
        </p>
      </header>
      <ListingForm />
    </main>
  );
}