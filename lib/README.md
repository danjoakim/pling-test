# lib/

Code from others, copied here so the page does not fetch code from the internet when it starts.

- `supabase.js` is `dist/umd/supabase.js` from the npm package `@supabase/supabase-js` version 2.45.4 (MIT, licence in `LICENSE-supabase-js.txt`),
  unchanged. SHA-256: `8596965fe918e656600a1b568d3a168f5c0d3d22a600886bb6f44a6555db01e7`. Check it with `npm pack @supabase/supabase-js@2.45.4`
  and compare `package/dist/umd/supabase.js`. (Until 31 Oct 2026 the page loaded `supabase.min.js` from the jsdelivr CDN, which makes that file on the fly.)
- `qrcode.js` is qrcode-generator (licence in `LICENSE-qrcode-generator.txt`).
- `jsqr.js` is `dist/jsQR.js` from the npm package `jsqr` version 1.4.0 (Apache-2.0, licence in `LICENSE-jsqr.txt`), unchanged. SHA-256:
  `3325b0888fa4745c4e6940897d8c4f426fbaae76901fcbfe1871a04e90a51655`. It reads QR codes from the camera in "Skann kompisens kode"; the page loads it
  only when the scanner is opened.
