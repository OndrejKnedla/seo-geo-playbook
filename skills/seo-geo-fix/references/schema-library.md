# Schema (JSON-LD) library

Copy-paste starting points for the schema types that actually matter for SEO + AI citation. Rules
that apply to all of them:

- **Render it in the SERVER HTML** as a plain `<script type="application/ld+json">`, not via a
  client-side script loader. Verify: `curl -s URL | grep -c 'application/ld+json'`.
- **Absolute URLs** everywhere, one canonical host.
- **One `Organization`/`WebSite` entity** with a stable `@id`; reference it from other types via `@id`.
- **The markup must match the visible content** (no invented ratings, no prices that differ from the page).
- schema.org v30.0 (Mar 2026): `Attorney` is deprecated → use `LegalService`.
- Google retired FAQ rich *results* (May 2026), but `FAQPage` content still feeds AI citations, keep it where genuinely useful, don't spam it site-wide.

## Organization + WebSite (site-wide, in the root layout)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://example.com/#org",
      "name": "Brand",
      "url": "https://example.com",
      "logo": "https://example.com/logo.png",
      "sameAs": [
        "https://www.linkedin.com/company/brand",
        "https://www.youtube.com/@brand",
        "https://github.com/brand"
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://example.com/#website",
      "url": "https://example.com",
      "name": "Brand",
      "publisher": { "@id": "https://example.com/#org" },
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://example.com/search?q={query}",
        "query-input": "required name=query"
      }
    }
  ]
}
</script>
```

## Article / BlogPosting (with named author = E-E-A-T)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Exact H1 of the article",
  "datePublished": "2026-06-01",
  "dateModified": "2026-06-10",
  "author": { "@type": "Person", "name": "Jane Doe", "url": "https://example.com/team/jane" },
  "publisher": { "@id": "https://example.com/#org" },
  "mainEntityOfPage": "https://example.com/blog/slug",
  "image": "https://example.com/blog/slug/cover.png"
}
</script>
```

## FAQPage (content feeds AI even without rich results)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Question phrased exactly as a user would ask it?",
      "acceptedAnswer": { "@type": "Answer", "text": "A self-contained 40-60 word answer matching the visible page." }
    }
  ]
}
</script>
```

## Product / Offer (e-commerce + SaaS pricing, keep prices identical to the page)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product",
  "description": "What it is, in one factual sentence.",
  "brand": { "@id": "https://example.com/#org" },
  "offers": {
    "@type": "Offer",
    "price": "199.00",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock",
    "url": "https://example.com/pricing"
  }
}
</script>
```

## SoftwareApplication (SaaS / apps)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "App",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "publisher": { "@id": "https://example.com/#org" }
}
</script>
```

## BreadcrumbList (helps engines and AI understand hierarchy)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://example.com" },
    { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://example.com/blog" },
    { "@type": "ListItem", "position": 3, "name": "Article", "item": "https://example.com/blog/slug" }
  ]
}
</script>
```

## Avoid
- `HowTo` rich results (deprecated by Google), the schema is harmless as context but earns no rich result.
- `SpecialAnnouncement`, `ClaimReview` unless you genuinely qualify.
- Placeholder values, `@type` arrays you don't need, ratings/reviews you didn't collect.
