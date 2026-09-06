# Casita Lia

A responsive condominium-stay website built with HTML, CSS, and vanilla JavaScript. Open `index.html` directly or use your editor's local preview server. No build or installation is required.

The page introduces the property, photos, sleeping arrangements, amenities and location before the family story and arrival information. Its booking flow prepares an inquiry for the host to confirm; it has no live availability calendar or payment collection.

## Property configuration

Edit the JSON inside `<script type="application/json" id="casita-config">` in the head of `index.html`. Use valid JSON with quoted property names and no comments or trailing commas. JavaScript uses this configuration for property facts, booking rules, contact actions, photo counts and metadata.

| Property | Current value | Purpose |
| --- | --- | --- |
| `bookingEmail` | Empty | Confirmed host email; preferred when both contact methods are set. |
| `bookingURL` | Empty | Confirmed Messenger, Airbnb or other contact page, beginning with `https://` or `http://`. |
| `parkingPrice` | `100` | Price in pesos per night, already confirmed by the owner. |
| `poolPrice` | `200` | Price in pesos per person; separate from the accommodation rate. |
| `maximumGuests` | `8` | Guest options, validation and all capacity labels. |
| `bedrooms` | `3` | Property labels and confirmed accommodation metadata. |
| `checkInTime` | `"15:00"` | Local property time in 24-hour `HH:MM` format. |
| `checkOutTime` | `"12:00"` | Local property time in 24-hour `HH:MM` format. |
| `siteURL` | Empty | Verified absolute public URL of this page, when available. |
| `gallery` | Five existing photos | Ordered photo entries, described below. |

Display values use `[data-property="parkingPrice"]`, `[data-property="poolPrice"]`, `[data-property="maximumGuests"]`, `[data-property="bedrooms"]`, `[data-property="checkInTime"]` and `[data-property="checkOutTime"]`. Keep those attributes when editing copy. Prices are numeric JSON values without a currency symbol. Invalid values fall back to the confirmed defaults in the configuration section of `script.js`.

The HTML includes readable fallback content for guests without JavaScript. When confirmed property facts change, update those static fallbacks for no-JavaScript visitors and crawlers too. The fallback values in `script.js` should always describe the last confirmed property information.

## Booking contact and inquiry flow

The previous email address was rejected by the owner. Both contact destinations remain empty until a correct address or URL is supplied. No unverified email, listing or social page is published. Parking is already confirmed at **₱100 per night** and does not require another confirmation.

Set `bookingEmail` or `bookingURL` in the configuration when the official contact is available. Nonempty valid `data-booking-email` and `data-booking-url` attributes on `<body>` remain supported as overrides for existing integrations. Email takes priority. The footer contact link and inquiry action update automatically.

The booking form collects stay dates, guest count, name, email, an optional request and policy agreement. It then shows a review of the prepared message. The question mode asks for name, email and a question without requiring dates or policy agreement. Neither mode sends a message or reserves dates on its own.

- **Open Email** opens an email draft containing the complete inquiry. The guest reviews and sends it in their email app.
- **Send via Messenger** opens the configured Messenger/Facebook destination.
- **Continue on Airbnb** opens the configured Airbnb destination.
- **Contact Your Host** opens another configured contact page.
- When a web contact action is chosen, the site also attempts to copy the prepared text so the guest can paste and send it there. It reports clipboard success or failure accurately. It does not append unsupported message-prefill parameters to Messenger or Airbnb links.
- **Copy Inquiry** remains a secondary action when a direct destination is available. With no configured destination, it is the primary action and the page explains that contact details are being updated.

Dates and guest counts stay synchronized between the hero bar and dialog. A valid check-in suggests the following day's check-out if the existing departure is missing or no longer follows arrival. An explicitly invalid check-out shows a friendly validation message. Calendar limits refresh at midnight, on tab return and when a page is restored. An expired booking review returns to the date fields; questions retain their separate flow.

## Images and content

Existing photography and the Casita Lia logo are preserved. Responsive WebP versions include 480px, 960px, and original-width variants, with JPEG fallbacks. Original assets remain untouched. Reviews, ratings, awards and unconfirmed social/platform links are omitted.

The `gallery` array accepts up to 20 real property photos. Each entry uses `src`, `title`, `alt` and `category`, for example:

```json
{
  "src": "assets/images/casita-lia-hero.jpg",
  "title": "The living space",
  "alt": "A bright living area with a sofa and wide windows",
  "category": "Living Room"
}
```

The first five entries populate the editorial grid. All entries appear in the lightbox with keyboard controls, swipe controls, thumbnails and the correct count. Category buttons appear automatically when there are more than five photos across multiple categories; keyboard and swipe navigation then follow the selected category. Use `[data-photo-count]` for visible counts, or `data-photo-count="padded"` for a leading zero. The current five-photo layout remains unchanged until real additional photos are supplied.

Known photos retain their responsive WebP sources. Additional photos may include an optional `thumbnail` path pointing to a smaller version; otherwise their `src` is used. Add optimized assets before adding their paths to the configuration. Empty or invalid gallery configuration falls back to the existing grid. Do not use generated or stock photographs as representations of the property.

Google Fonts load externally. Google Maps loads only after the guest chooses “Explore the map.” The page requires no booking server and stores no inquiry information in local or session storage.

## Metadata and publishing

The page includes property-specific titles, descriptions, Open Graph/Twitter metadata and confirmed `LodgingBusiness`/`Apartment` structured data. With no public URL supplied, it does not invent a canonical address or listing URL.

Once `siteURL` is configured, JavaScript updates the canonical link, `og:url`, absolute social-image URLs and structured-data URL. Use the complete public page URL; a directory URL should end in `/` so relative image paths resolve correctly. Property capacity, bedroom count and arrival times are also synchronized from configuration.

Social preview crawlers may not execute JavaScript. Before publishing at a confirmed production address, put the resulting canonical and absolute social metadata into the source HTML as well, or use your host's prerendering support. Keep the static metadata and property fallbacks consistent with the configuration. Never add unverified ratings, booking counts or reviews to structured data.

## Verification

The optional `.checks` scripts use the installed Chrome browser through PowerShell. They check responsive layouts, booking and question validation, gallery controls, dialog focus, policies, image loading, and navigation. Reports and preview images are saved in `.checks/results`.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\.checks\browser-check.ps1 -ActionScript .\.checks\interactions.js -FullPage
powershell -NoProfile -ExecutionPolicy Bypass -File .\.checks\final-visuals.ps1
```
