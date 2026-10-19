# Delta Housing discovery notes

## Listing discovery behavior

- Listing cards open Quick View from the photo or title. The card also exposes
  **View full listing**, and the actions menu offers **Share listing** and
  **Open full listing**.
- Search results open the same Quick View. Its footer links to the public
  `/listings/[id]` page.
- Saved listing IDs and campus preference are stored in browser local storage.
  They are device-local conveniences, not account-backed or synchronized data.
- Campus filtering matches the campus value explicitly present on a listing.
  Listings without a campus value do not match a campus filter.
- The feed presents only **All places**, **Available**, and **Under
  construction**. It does not infer popularity or ratings as editorial
  categories.
- Listing cards and details do not display estimated walk times or map sketches.
  Distance data has not been verified as precise routing information.

## Campus preference and source limitations

Campus choice is manual and optional. No programme-to-campus recommendation is
made because the official pages reviewed did not provide a verified programme
to campus crosswalk:

- [University of Delta homepage](https://unidel.edu.ng/)
- [University academics page](https://unidel.edu.ng/academics/)
- [University campuses page](https://unidel.edu.ng/campuses/) (returned 404 when
  reviewed)
- [University programmes page](https://unidel.edu.ng/programmes/) (returned 404
  when reviewed)

The homepage and academics page provide general institutional or programme
information, but not a reliable mapping suitable for automatically choosing a
student's campus. Re-check official university sources before adding such a
recommendation.

## Current product limitations

- Saved places are not persisted in PostgreSQL and are not tied to Clerk users.
- Campus preference is a client-side filter, not a verified campus assignment.
- Messaging and inspection workflows still need real backend operations before
  they can be described as functional.
