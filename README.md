# Wayfarer

A simple travel planning tool. This is the initial landing page: **"Plan your next adventure."**

## Project structure

```
.
├── index.html      # Landing page markup
├── css/style.css   # Styles
├── js/main.js      # Small bit of interactivity (waitlist form, footer year)
└── README.md
```

This is a static site — no build step, no dependencies.

## Local preview

Open `index.html` directly in a browser, or serve it locally:

```bash
npx serve .
```

## Deploying to Cloudflare Pages

1. Push this repo to GitHub (already done if you're reading this on GitHub).
2. Go to the [Cloudflare dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
3. Select the `newtest` repository.
4. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave blank)*
   - **Build output directory:** `/`
5. Click **Save and Deploy**. Cloudflare will build and give you a `*.pages.dev` URL.
6. (Optional) Add a custom domain under the Pages project's **Custom domains** tab.

Every future push to the connected branch will auto-deploy.
