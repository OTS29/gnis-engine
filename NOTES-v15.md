# v15: live numbers + real directory on the landing page
- Hero: search bar (business, service or place) and four live numbers: Businesses, People on GNIS, Bookings made, Booked today. They come from your database, refresh every 30 seconds and count up smoothly. Nothing is invented.
- Directory section replaces the old made-up sample listings. It shows real published businesses with a photo (if they use an uploaded image), place, services, "From" price, country filter chips with counts, and Show more.
- New routes: /api/public/stats and /api/public/directory. No database change.
- Video: still off. To turn it on, put a short demo.mp4 in the `public` folder and change SHOW_VIDEO to true at the top of src/app/page.js.
