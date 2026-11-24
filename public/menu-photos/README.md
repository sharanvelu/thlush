# Menu photos

Put a photo here named after a menu item and it shows on the customer menu. There's no need to restart or
redeploy locally: the next page load picks it up.

- **Name it like the item.** Case, spaces and punctuation don't matter: `Cold Coffee.jpg`, `cold-coffee.jpg`
  and `COLD_COFFEE.jpg` all match the item "Cold Coffee".
- **Types:** `.webp`, `.jpg`, `.jpeg` or `.png`. If one item has two files, `.webp` wins over `.jpg`,
  then `.jpeg`, then `.png`.
- **A photo here replaces** the one uploaded for that item in the staff app (Menu > item > photo).
- **Rename the item, rename the photo.** A file whose name matches no item is ignored.
- **Keep them small:** about 800 px wide and under 200 KB each. They load on customers' phones.

On Vercel, photos go live with the next deploy.
