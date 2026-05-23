# SEO & Metadata in Next.js

## Quick Reference

| API | Where | Purpose |
|---|---|---|
| `metadata` export | `page.tsx` / `layout.tsx` | Static metadata object |
| `generateMetadata()` | `page.tsx` | Dynamic metadata (needs params or fetch) |
| `<title>` template | Root layout | Consistent title suffix across pages |
| `next/og` `ImageResponse` | `opengraph-image.tsx` | Generate OG images with JSX |
| `sitemap.ts` | `app/` root | Generate XML sitemap |
| `robots.ts` | `app/` root | Generate robots.txt |
| `generateViewport()` | `page.tsx` / `layout.tsx` | Viewport meta tag |

---

## Why SEO Matters in Next.js Context

Client-side React apps (CRA, Vite SPAs) have a fundamental SEO problem: the HTML the search engine crawler sees is a blank shell. Crawlers have improved at running JavaScript, but they're slower, less reliable, and don't execute all JS. SSR/SSG pages ship fully-formed HTML — meta tags, OG tags, content — without any JS execution required.

Next.js 13+ (App Router) makes metadata a first-class concept with a typed API, automatic deduplication, and generation from async data.

---

## Static Metadata

Export a typed `metadata` object from any `page.tsx` or `layout.tsx`:

```tsx
// app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | Acme Corp', // %s is replaced by child page title
    default: 'Acme Corp',       // used when no child sets a title
  },
  description: 'The best product on the market',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://acme.com',
    siteName: 'Acme Corp',
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@acmecorp',
  },
};
```

```tsx
// app/products/page.tsx
export const metadata: Metadata = {
  title: 'Products', // renders as "Products | Acme Corp" (template applied)
  description: 'Browse our product catalog',
};
```

Next.js merges metadata from all layouts and the page — child fields override parent fields. The `title.template` from the root layout applies to all child pages automatically.

---

## Dynamic Metadata

When metadata depends on route params or fetched data, use `generateMetadata`:

```tsx
// app/blog/[slug]/page.tsx
import type { Metadata } from 'next';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await fetchPost(params.slug); // fetch is deduplicated with page's fetch

  if (!post) {
    return { title: 'Post Not Found' };
  }

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [{ url: post.coverImage, width: 1200, height: 630 }],
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author.name],
    },
    alternates: {
      canonical: `https://acme.com/blog/${params.slug}`,
    },
  };
}
```

`generateMetadata` runs in parallel with the page render — the fetch result is deduplicated if the page component fetches the same URL.

---

## Open Graph Images

### Static OG image

Place a `opengraph-image.png` (or `.jpg`, `.gif`) next to any `page.tsx` — Next.js serves it as the OG image automatically.

### Dynamic OG images with `ImageResponse`

```tsx
// app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage({ params }: { params: { slug: string } }) {
  const post = await fetchPost(params.slug);

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', padding: 60, background: '#fff' }}>
        <h1 style={{ fontSize: 64 }}>{post.title}</h1>
        <p style={{ fontSize: 32, color: '#666' }}>{post.excerpt}</p>
      </div>
    ),
    { ...size }
  );
}
```

`ImageResponse` renders JSX to a PNG using a subset of CSS (flexbox, basic typography). Runs at the edge for fast generation.

---

## Sitemap

```tsx
// app/sitemap.ts
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await fetchAllPosts();

  return [
    {
      url: 'https://acme.com',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
    },
    ...posts.map(post => ({
      url: `https://acme.com/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
```

Returns the sitemap at `/sitemap.xml` automatically.

---

## Robots.txt

```tsx
// app/robots.ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: 'https://acme.com/sitemap.xml',
  };
}
```

---

## JSON-LD Structured Data

JSON-LD helps search engines understand content type (article, product, FAQ, etc.) for rich search results. Add it as a `<script>` in the component:

```tsx
async function ProductPage({ params }) {
  const product = await fetchProduct(params.id);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'USD',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDisplay product={product} />
    </>
  );
}
```

---

## Canonical URLs

Prevent duplicate content penalties when the same content is accessible at multiple URLs:

```tsx
export const metadata: Metadata = {
  alternates: {
    canonical: 'https://acme.com/products', // absolute URL
    languages: {
      'en-US': 'https://acme.com/en-US/products',
      'de-DE': 'https://acme.com/de-DE/products',
    },
  },
};
```

---

> **Check yourself:** Why does `generateMetadata` colocate with the page component instead of being separate? Because metadata often depends on the same data the page renders. By running in the same request context, `generateMetadata` can fetch the same data the page fetches — and Next.js deduplicates those fetches. A separate metadata layer (like Pages Router's `next/head`) can't deduplicate fetches with the page component.

---

## Self-Assessment

- [ ] I can write a static `metadata` export with `title.template`, description, and OG tags
- [ ] I can write a `generateMetadata` function for a dynamic route
- [ ] I know how to generate dynamic OG images with `ImageResponse`
- [ ] I can create a `sitemap.ts` and `robots.ts`
- [ ] I understand when and how to add JSON-LD structured data

---

## Interview Q&A

**Q: How does Next.js App Router handle SEO metadata differently from the Pages Router? `High`**

A: The App Router uses a typed `metadata` export or `generateMetadata` function in each `page.tsx` or `layout.tsx`. Next.js generates the appropriate `<meta>` and `<link>` tags server-side and merges metadata from parent layouts into child pages. The Pages Router used `next/head` — a client-side head management component that worked more like React Helmet. The App Router approach is statically analyzable, type-safe, and deduplicates data fetches with the page component.

---

**Q: What is `generateMetadata` and when do you need it instead of a static `metadata` export? `High`**

A: `generateMetadata` is an async function that receives route params and returns a `Metadata` object. Use it when metadata depends on runtime data — the page's route params, fetched data, or database values. Static `metadata` works for pages with hardcoded titles and descriptions. `generateMetadata` fetches are deduplicated with the page component's fetches for the same URL.

---

**Q: How do you generate dynamic OG images in Next.js? `Medium`**

A: Create an `opengraph-image.tsx` next to your `page.tsx`. Export a default function that returns an `ImageResponse` from `next/og`. Inside, write JSX using a flexbox CSS subset — Next.js renders it to a PNG at the edge. The image is served at `/{route}/opengraph-image` and automatically added to the page's OG meta tags.

---

**Q: Why is structured data (JSON-LD) useful for SEO? `Medium`**

A: JSON-LD tells search engines the semantic meaning of your content using Schema.org vocabulary. A product page with JSON-LD gets Google's "rich result" formatting — price, rating, availability shown directly in search results. A recipe page shows cooking time and ratings. A FAQ page gets an expandable Q&A in search results. None of this happens from HTML alone — it requires structured data.

---

**Q: How do canonical URLs prevent SEO penalties? `Low`**

A: Duplicate content (same content at multiple URLs) splits link equity and confuses crawlers about which URL to index. The canonical `<link>` tag tells search engines which URL is the "true" version. Common cases: paginated content (`/products?page=2` should canonicalize to `/products`), print versions, and internationalized routes. Next.js sets it via `metadata.alternates.canonical`.
