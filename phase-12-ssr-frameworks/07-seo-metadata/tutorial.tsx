// ============================================================
// Topic:   SEO & Metadata in Next.js
// Phase:   12 — SSR and Meta-Frameworks
// File:    tutorial.tsx
//
// Exercise type: BUILD IT + INTERACTIVE PREVIEW
//
// Metadata is one topic where you CAN write real code that
// produces visible output — even in Vite. This file:
//
//   1. Write static metadata objects — verify the output
//   2. Write generateMetadata for a dynamic route
//   3. Build a live OG card preview (see social cards)
//   4. Debug broken metadata patterns
//
// Run: npm run tutorial 07-seo-metadata
// ============================================================

import { useState, FC } from 'react';

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — Write the metadata export
//
// Static metadata is the most common metadata pattern.
// Write a complete metadata object for a given page,
// then compare your mental model with the reference.
//
// You'll write:
//   - Title with template (%s | Site Name)
//   - Description
//   - Open Graph (title, description, images, type)
//   - Twitter card
//   - Canonical URL
// ─────────────────────────────────────────────────────────────

const METADATA_REQUIREMENT = `Page: /products — Product Catalog

Write the metadata export for this page. Requirements:
  • Title: "Products" (root layout template: "%s | Acme Shop")
    → Final <title>: "Products | Acme Shop"
  • Description: "Browse 10,000+ products from top brands"
  • Open Graph:
    - type: 'website'
    - title: "Acme Shop Products"
    - description: same as page description
    - url: 'https://acme-shop.com/products'
    - siteName: 'Acme Shop'
    - images: one image at 'https://acme-shop.com/og/products.png', 1200x630
  • Twitter:
    - card: 'summary_large_image'
    - site: '@acmeshop'
  • Canonical URL: 'https://acme-shop.com/products'`;

const METADATA_STUB = `// app/products/page.tsx
import type { Metadata } from 'next';

// TODO: Export the metadata object.
// Typescript will guide you — Metadata is fully typed.
export const metadata: Metadata = {
  title: '...',           // TODO
  description: '...',     // TODO
  openGraph: {
    // TODO
  },
  twitter: {
    // TODO
  },
  alternates: {
    // TODO: canonical URL
  },
};

export default function ProductsPage() {
  return <h1>Products</h1>;
}`;

const METADATA_SOLUTION = `// app/products/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  // With the root layout template "%s | Acme Shop":
  // → renders as <title>Products | Acme Shop</title>
  title: 'Products',
  description: 'Browse 10,000+ products from top brands',

  openGraph: {
    type: 'website',
    title: 'Acme Shop Products',
    description: 'Browse 10,000+ products from top brands',
    url: 'https://acme-shop.com/products',
    siteName: 'Acme Shop',
    images: [
      {
        url: 'https://acme-shop.com/og/products.png',
        width: 1200,
        height: 630,
        alt: 'Acme Shop product catalog',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    site: '@acmeshop',
  },

  alternates: {
    canonical: 'https://acme-shop.com/products',
  },
};

// Next.js generates these <head> tags automatically:
// <title>Products | Acme Shop</title>
// <meta name="description" content="Browse 10,000+ products..." />
// <meta property="og:type" content="website" />
// <meta property="og:title" content="Acme Shop Products" />
// <meta property="og:url" content="https://acme-shop.com/products" />
// <meta property="og:image" content="https://acme-shop.com/og/products.png" />
// <meta name="twitter:card" content="summary_large_image" />
// <link rel="canonical" href="https://acme-shop.com/products" />`;

const ROOT_LAYOUT_METADATA = `// app/layout.tsx — ROOT LAYOUT
// Sets the title template for the entire site
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | Acme Shop', // %s = child page's title
    default: 'Acme Shop',       // shown when no child sets a title
  },
  description: 'The best online shop',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Acme Shop',
  },
};

// With this root metadata, child pages only need to set:
// export const metadata: Metadata = { title: 'Products' };
// → <title>Products | Acme Shop</title>
//
// Metadata merges: child fields OVERRIDE parent fields.
// Non-overridden fields (siteName, locale) inherit from parent.`;

function Exercise1_WriteMetadata() {
  const [view, setView] = useState<'requirement' | 'stub' | 'solution' | 'root'>('requirement');

  return (
    <section>
      <h2>Exercise 1: Write the Metadata Export</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Read the requirements. Write the metadata object from memory (in your head or editor).
        Then compare with the reference and read the root layout template pattern.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {(['requirement', 'stub', 'solution', 'root'] as const).map((v, i) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: '0.4rem 1rem', borderRadius: '6px', border: '2px solid',
              borderColor: view === v ? '#1a73e8' : '#ddd',
              background: view === v ? '#e8f0fe' : '#fff',
              color: view === v ? '#1a73e8' : '#333',
              cursor: 'pointer', fontSize: '0.8rem',
            }}
          >
            {i + 1}. {v === 'requirement' ? 'Requirements' : v === 'stub' ? 'Stub' : v === 'solution' ? 'Solution' : 'Root layout'}
          </button>
        ))}
      </div>

      <pre style={{ background: '#1e1e2e', color: view === 'solution' || view === 'root' ? '#a9dc76' : '#cdd6f4', padding: '1.25rem', borderRadius: '8px', fontSize: '0.78rem', overflow: 'auto', lineHeight: 1.8 }}>
        {view === 'requirement' ? METADATA_REQUIREMENT : view === 'stub' ? METADATA_STUB : view === 'solution' ? METADATA_SOLUTION : ROOT_LAYOUT_METADATA}
      </pre>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>What is the final <code>&lt;title&gt;</code> tag text for this page? (Answer: "Products | Acme Shop")</li>
          <li>What happens to <code>openGraph.siteName</code> in the root layout when a child page exports its own metadata?
            (It's inherited — child metadata is merged with parent. Only fields the child sets are overridden.)</li>
          <li>If a child page sets <code>title: 'Products'</code> but the root layout has <code>title.default: 'Acme Shop'</code>,
            which wins? (Child wins — child fields override parent.)</li>
          <li>Can you have metadata in a <code>layout.tsx</code> instead of a <code>page.tsx</code>?
            (Yes — it applies to all pages within that layout segment.)</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Write generateMetadata for a dynamic route
//
// Static metadata is for fixed pages. Dynamic routes need
// generateMetadata — an async function that receives params
// and returns the Metadata object.
//
// Key insight: its fetch is DEDUPLICATED with the page's fetch.
// ─────────────────────────────────────────────────────────────

const GENERATE_METADATA_STUB = `// app/blog/[slug]/page.tsx
import type { Metadata } from 'next';

interface Props {
  params: { slug: string };
}

// TODO: Export a generateMetadata function
//   - It's an ASYNC function (not a value)
//   - It receives the same { params } as the page
//   - Fetch the post by slug (pretend: fetchPost(slug))
//   - If post not found: return { title: 'Post Not Found' }
//   - Return:
//     - title: post.title
//     - description: post.excerpt
//     - openGraph:
//         type: 'article'
//         title, description (same)
//         publishedTime: post.publishedAt
//         authors: [post.author.name]
//         images: [{ url: post.coverImage, width: 1200, height: 630 }]
//     - alternates.canonical: 'https://blog.example.com/blog/' + slug
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // TODO: implement
}

export default async function BlogPostPage({ params }: Props) {
  const post = await fetchPost(params.slug); // same fetch as above
  // Next.js deduplicates — one HTTP request for both generateMetadata + page
  return <PostContent post={post} />;
}`;

const GENERATE_METADATA_SOLUTION = `// app/blog/[slug]/page.tsx
import type { Metadata } from 'next';

interface Post {
  title: string;
  excerpt: string;
  coverImage: string;
  publishedAt: string;
  author: { name: string };
}

interface Props {
  params: { slug: string };
}

// generateMetadata is async — it can fetch, query DB, etc.
// IMPORTANT: this fetch is automatically DEDUPLICATED with the
// page component's identical fetch. One HTTP request total.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await fetchPost(params.slug);

  if (!post) {
    return {
      title: 'Post Not Found',
      // Still good practice to return something meaningful
    };
  }

  return {
    title: post.title,           // with root template: "Post Title | Blog"
    description: post.excerpt,

    openGraph: {
      type: 'article',           // enables article-specific OG tags
      title: post.title,
      description: post.excerpt,
      images: [
        {
          url: post.coverImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      publishedTime: post.publishedAt,   // article-specific
      authors: [post.author.name],        // article-specific
    },

    alternates: {
      canonical: \`https://blog.example.com/blog/\${params.slug}\`,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  // THIS IS THE SAME FETCH as in generateMetadata above.
  // Next.js deduplicates: one network request serves both.
  const post = await fetchPost(params.slug);
  if (!post) notFound();
  return <PostContent post={post} />;
}`;

function Exercise2_GenerateMetadata() {
  const [view, setView] = useState<'stub' | 'solution'>('stub');
  const [showDedup, setShowDedup] = useState(false);

  return (
    <section>
      <h2>Exercise 2: generateMetadata for Dynamic Routes</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        When metadata depends on route params or fetched data, you need{' '}
        <code>generateMetadata</code> — the async alternative to a static export.
        Read the stub, implement it mentally, then compare.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setView('stub')}
          style={{
            padding: '0.4rem 1rem', borderRadius: '6px', border: '2px solid',
            borderColor: view === 'stub' ? '#1a73e8' : '#ddd',
            background: view === 'stub' ? '#e8f0fe' : '#fff',
            color: view === 'stub' ? '#1a73e8' : '#333',
            cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          Stub (TODOs)
        </button>
        <button
          onClick={() => setView('solution')}
          style={{
            padding: '0.4rem 1rem', borderRadius: '6px', border: '2px solid',
            borderColor: view === 'solution' ? '#27ae60' : '#ddd',
            background: view === 'solution' ? '#e8f5e9' : '#fff',
            color: view === 'solution' ? '#27ae60' : '#333',
            cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          Solution
        </button>
      </div>

      <pre style={{ background: '#1e1e2e', color: view === 'solution' ? '#a9dc76' : '#cdd6f4', padding: '1.25rem', borderRadius: '8px', fontSize: '0.78rem', overflow: 'auto', lineHeight: 1.8, marginBottom: '1rem' }}>
        {view === 'stub' ? GENERATE_METADATA_STUB : GENERATE_METADATA_SOLUTION}
      </pre>

      <button
        onClick={() => setShowDedup(s => !s)}
        style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: 'none', background: '#8e44ad', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '1rem' }}
      >
        {showDedup ? 'Hide' : 'Show →'} how fetch deduplication works here
      </button>

      {showDedup && (
        <div style={{ background: '#f9f0ff', border: '1px solid #d4a8e8', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
          <strong>Fetch deduplication in action:</strong>
          <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <p style={{ margin: '0 0 0.5rem', color: '#555' }}><strong>What you write:</strong></p>
              <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: '0.6rem', borderRadius: '4px', fontSize: '0.75rem', margin: 0, lineHeight: 1.6 }}>
{`// generateMetadata
const post = await fetchPost(slug);

// page component
const post = await fetchPost(slug);

// Two identical calls!`}
              </pre>
            </div>
            <div>
              <p style={{ margin: '0 0 0.5rem', color: '#555' }}><strong>What Next.js does:</strong></p>
              <pre style={{ background: '#1e1e2e', color: '#a9dc76', padding: '0.6rem', borderRadius: '4px', fontSize: '0.75rem', margin: 0, lineHeight: 1.6 }}>
{`// One HTTP request to:
// fetchPost(slug)

// Cached result shared between:
// → generateMetadata() ✓
// → BlogPostPage()     ✓

// Zero duplicated requests`}
              </pre>
            </div>
          </div>
          <p style={{ margin: '0.75rem 0 0', color: '#555', lineHeight: 1.6 }}>
            Next.js deduplicates identical <code>fetch()</code> calls within a single render pass.
            This is why you can safely call the same fetch in both <code>generateMetadata</code> and the page component —
            it's one network request, not two.
          </p>
        </div>
      )}

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
        <strong>TODO:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>Why is <code>generateMetadata</code> a function and not just a variable? What does the async part enable?
            (It can await data fetches, so metadata is dynamic — pulled from DB, CMS, etc.)</li>
          <li>When does <code>generateMetadata</code> run? Before the page renders, after, or simultaneously?
            (In parallel with the page component — both start at the same time)</li>
          <li>What is the OG type 'article' vs 'website'? Why does it matter?
            (article enables article-specific OG tags like publishedTime, authors. Facebook/LinkedIn/Discord use these for richer link previews.)</li>
          <li>How does the Pages Router handle dynamic metadata?
            (It uses <code>next/head</code> inside the component body — not colocated with data fetching, less clean.)</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — Live OG Card Preview Builder
//
// Open Graph cards are what social networks show when you paste a URL.
// This exercise lets you build the metadata and see the simulated card.
//
// YOU BUILD IT: fill in the metadata fields and see the card update live.
// Then understand what each field controls.
// ─────────────────────────────────────────────────────────────

interface OGCardData {
  title: string;
  description: string;
  siteName: string;
  imageUrl: string;
  twitterCard: 'summary' | 'summary_large_image';
  url: string;
}

function OGCard({ data, platform }: { data: OGCardData; platform: 'twitter' | 'facebook' | 'slack' }) {
  const isLarge = data.twitterCard === 'summary_large_image';
  const hasImage = data.imageUrl.trim() !== '';

  if (platform === 'twitter') {
    return (
      <div style={{
        border: '1px solid #d9d9d9',
        borderRadius: '12px',
        overflow: 'hidden',
        maxWidth: '520px',
        background: '#fff',
        fontFamily: 'system-ui',
      }}>
        {hasImage && isLarge && (
          <div style={{
            height: '260px',
            background: data.imageUrl.startsWith('http') ? `url(${data.imageUrl}) center/cover` : '#e8f0fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#888',
            fontSize: '0.85rem',
          }}>
            {!data.imageUrl.startsWith('http') && 'OG Image Preview (1200×630)'}
          </div>
        )}
        <div style={{ padding: '12px 14px', display: 'flex', gap: '10px', alignItems: hasImage && !isLarge ? 'flex-start' : 'initial' }}>
          {hasImage && !isLarge && (
            <div style={{ width: '80px', height: '80px', background: '#e8f0fe', borderRadius: '4px', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 2px', fontSize: '0.8rem', color: '#8899a6' }}>{data.siteName || data.url}</p>
            <p style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 700, color: '#14171a', lineHeight: 1.3 }}>
              {data.title || 'Page Title'}
            </p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#8899a6', lineHeight: 1.4 }}>
              {data.description || 'Page description will appear here'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (platform === 'facebook') {
    return (
      <div style={{
        border: '1px solid #dadde1',
        maxWidth: '504px',
        background: '#f2f3f5',
        fontFamily: 'Georgia, serif',
      }}>
        <div style={{
          height: '261px',
          background: hasImage && data.imageUrl.startsWith('http')
            ? `url(${data.imageUrl}) center/cover`
            : '#e9eaed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#8a8d91',
          fontSize: '0.85rem',
        }}>
          {!hasImage && 'OG Image (1200×630 recommended)'}
        </div>
        <div style={{ padding: '10px 12px' }}>
          <p style={{ margin: '0 0 2px', fontSize: '0.7rem', color: '#8a8d91', textTransform: 'uppercase' }}>
            {new URL(data.url || 'https://example.com').hostname}
          </p>
          <p style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700, color: '#1d2129', lineHeight: 1.3 }}>
            {data.title || 'Page Title'}
          </p>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#606770', lineHeight: 1.4 }}>
            {data.description || 'Description'}
          </p>
        </div>
      </div>
    );
  }

  // Slack
  return (
    <div style={{
      borderLeft: '4px solid #e8e8e8',
      padding: '4px 12px',
      maxWidth: '450px',
      fontFamily: 'system-ui',
    }}>
      <p style={{ margin: '0 0 4px', fontSize: '0.85rem', fontWeight: 700, color: '#1264a3' }}>
        {data.siteName || new URL(data.url || 'https://example.com').hostname}
      </p>
      <p style={{ margin: '0 0 6px', fontSize: '0.95rem', fontWeight: 700, color: '#1d1c1d' }}>
        {data.title || 'Page Title'}
      </p>
      <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#616061' }}>
        {data.description || 'Description'}
      </p>
      {hasImage && (
        <div style={{ height: '200px', background: '#e8f0fe', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '0.8rem' }}>
          Image preview
        </div>
      )}
    </div>
  );
}

function Exercise3_OGCardBuilder() {
  const [data, setData] = useState<OGCardData>({
    title: 'How to Build Fast Web Apps',
    description: 'A deep dive into SSR, SSG, and ISR patterns for optimal performance and SEO.',
    siteName: 'Tech Blog',
    imageUrl: '',
    twitterCard: 'summary_large_image',
    url: 'https://techblog.example.com/posts/fast-web-apps',
  });
  const [platform, setPlatform] = useState<'twitter' | 'facebook' | 'slack'>('twitter');

  function update(key: keyof OGCardData, value: string) {
    setData(prev => ({ ...prev, [key]: value }));
  }

  const generatedCode = `export const metadata: Metadata = {
  title: '${data.title}',
  description: '${data.description}',
  openGraph: {
    type: 'article',
    title: '${data.title}',
    description: '${data.description}',
    url: '${data.url}',
    siteName: '${data.siteName}',${data.imageUrl ? `
    images: [{ url: '${data.imageUrl}', width: 1200, height: 630 }],` : ''}
  },
  twitter: {
    card: '${data.twitterCard}',
  },
};`;

  return (
    <section>
      <h2>Exercise 3: OG Card Preview Builder</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Fill in the metadata fields. See how social platforms render your link preview.
        Understanding what each field controls is essential for production SEO work.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Form */}
        <div>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem' }}>Metadata Fields</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { key: 'title' as const, label: 'title', placeholder: 'Page title', hint: 'Used in <title> and og:title' },
              { key: 'description' as const, label: 'description', placeholder: 'Page description', hint: 'Used in <meta name="description"> and og:description' },
              { key: 'siteName' as const, label: 'openGraph.siteName', placeholder: 'Your Site Name', hint: 'Site branding shown in social cards' },
              { key: 'imageUrl' as const, label: 'openGraph.images[0].url', placeholder: 'https://example.com/og-image.png', hint: '1200×630px recommended' },
              { key: 'url' as const, label: 'openGraph.url', placeholder: 'https://example.com/page', hint: 'Canonical URL of the page' },
            ].map(({ key, label, placeholder, hint }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'monospace', color: '#1a73e8', marginBottom: '2px' }}>
                  {label}
                </label>
                <input
                  value={data[key]}
                  onChange={e => update(key, e.target.value)}
                  placeholder={placeholder}
                  style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#888' }}>{hint}</p>
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'monospace', color: '#1a73e8', marginBottom: '4px' }}>
                twitter.card
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['summary', 'summary_large_image'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => update('twitterCard', v)}
                    style={{
                      padding: '0.3rem 0.75rem', borderRadius: '4px', border: '1px solid',
                      borderColor: data.twitterCard === v ? '#1a73e8' : '#ddd',
                      background: data.twitterCard === v ? '#e8f0fe' : '#fff',
                      color: data.twitterCard === v ? '#1a73e8' : '#333',
                      cursor: 'pointer', fontSize: '0.8rem',
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Preview:</h3>
            {(['twitter', 'facebook', 'slack'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                style={{
                  padding: '0.25rem 0.75rem', borderRadius: '20px', border: '1px solid',
                  borderColor: platform === p ? '#333' : '#ddd',
                  background: platform === p ? '#333' : '#fff',
                  color: platform === p ? '#fff' : '#333',
                  cursor: 'pointer', fontSize: '0.75rem',
                  textTransform: 'capitalize',
                }}
              >
                {p === 'twitter' ? '𝕏 Twitter' : p === 'facebook' ? 'Facebook' : '# Slack'}
              </button>
            ))}
          </div>
          <OGCard data={data} platform={platform} />
        </div>
      </div>

      {/* Generated code */}
      <div>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>Generated Next.js metadata:</h3>
        <pre style={{ background: '#1e1e2e', color: '#a9dc76', padding: '1rem', borderRadius: '8px', fontSize: '0.78rem', overflow: 'auto', lineHeight: 1.8, margin: 0 }}>
          {generatedCode}
        </pre>
      </div>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>Try both twitter card types. What changes? (<code>summary_large_image</code> shows the image prominently. <code>summary</code> shows a small thumbnail.)</li>
          <li>What happens if you have <code>og:title</code> but no <code>twitter:title</code>? Twitter falls back to og:title — you only need to duplicate if they differ.</li>
          <li>Why does Facebook require the image to be 1200×630? (Aspect ratio: 1.91:1. Other sizes work but may be cropped or display poorly.)</li>
          <li>When would <code>og:type = 'article'</code> be better than <code>'website'</code>? What additional tags does 'article' enable?
            (publishedTime, modifiedTime, authors, section, tags — used for rich previews in LinkedIn, Facebook.)</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — Debug Broken Metadata Patterns
//
// These are common mistakes in metadata implementation.
// Identify what's wrong before revealing the fix.
// ─────────────────────────────────────────────────────────────

interface MetadataBug {
  id: number;
  title: string;
  code: string;
  bug: string;
  fix: string;
}

const METADATA_BUGS: MetadataBug[] = [
  {
    id: 1,
    title: 'Using next/head inside a Server Component',
    code: `// app/about/page.tsx (App Router)
import Head from 'next/head'; // ❌ Wrong import

export default function AboutPage() {
  return (
    <>
      <Head>
        <title>About Us</title>
        <meta name="description" content="About page" />
      </Head>
      <main>About content</main>
    </>
  );
}`,
    bug: 'next/head is the Pages Router API. In the App Router, you export a metadata object or generateMetadata — you never use next/head in app/ directory pages. Using next/head here has no effect on the actual <head> tag.',
    fix: `// app/about/page.tsx (App Router)
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'About page',
};

export default function AboutPage() {
  return <main>About content</main>;
}`,
  },
  {
    id: 2,
    title: 'Relative URL in og:image',
    code: `// app/products/page.tsx
export const metadata: Metadata = {
  openGraph: {
    images: [
      {
        url: '/og/products.png', // ❌ Relative URL!
      },
    ],
  },
};`,
    bug: 'og:image must be an absolute URL. Social crawlers fetch this URL directly — they need the full URL including domain. A relative URL like /og/products.png will be left as-is in the meta tag and the crawler won\'t know which domain to fetch it from.',
    fix: `export const metadata: Metadata = {
  openGraph: {
    images: [
      {
        url: 'https://your-domain.com/og/products.png', // ✓ Absolute URL
        width: 1200,
        height: 630,
      },
    ],
  },
};

// Or use an environment variable:
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
images: [{ url: \`\${baseUrl}/og/products.png\` }]`,
  },
  {
    id: 3,
    title: 'No title template — inconsistent titles across pages',
    code: `// app/layout.tsx — root layout
export const metadata: Metadata = {
  title: 'Acme Shop', // ❌ Just a string, not a template
  description: 'Best shop online',
};

// app/products/page.tsx
export const metadata: Metadata = {
  title: 'Products', // Renders as just "Products" — loses site branding!
};

// app/about/page.tsx
export const metadata: Metadata = {
  title: 'About | Acme Shop', // Duplicates site name manually — easy to get wrong
};`,
    bug: 'The root layout has a plain string title, not a template. When child pages set their own title, it completely replaces the root title — no site branding. Each page must manually add "| Acme Shop" — error-prone and inconsistent.',
    fix: `// app/layout.tsx — root layout (CORRECT)
export const metadata: Metadata = {
  title: {
    template: '%s | Acme Shop', // %s = child page's title
    default: 'Acme Shop',       // shown when child sets no title
  },
};

// app/products/page.tsx — now just:
export const metadata: Metadata = {
  title: 'Products', // → "Products | Acme Shop" automatically
};

// app/about/page.tsx
export const metadata: Metadata = {
  title: 'About', // → "About | Acme Shop" automatically
};`,
  },
  {
    id: 4,
    title: 'Missing canonical URL — duplicate content penalty',
    code: `// /blog/my-post is accessible at multiple URLs:
// https://example.com/blog/my-post
// https://example.com/blog/my-post?utm_source=newsletter
// https://www.example.com/blog/my-post (www vs non-www)

// ❌ No canonical tag set — search engine doesn't know which is "real"
export const metadata: Metadata = {
  title: 'My Blog Post',
  description: 'Post content',
  // Missing: alternates.canonical
};`,
    bug: 'Without a canonical URL, search engines see multiple URLs with identical content and may split ranking signals between them — or penalize for duplicate content. Query parameters (?utm_source=...) and www/non-www variations make this very common.',
    fix: `// ✓ Always set canonical for content pages
export const metadata: Metadata = {
  title: 'My Blog Post',
  description: 'Post content',
  alternates: {
    canonical: 'https://example.com/blog/my-post', // always the clean URL
    // For i18n:
    // languages: {
    //   'en-US': 'https://example.com/en/blog/my-post',
    //   'es-ES': 'https://example.com/es/blog/mi-post',
    // }
  },
};`,
  },
];

function Exercise4_DebugMetadata() {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  return (
    <section>
      <h2>Exercise 4: Debug Broken Metadata Patterns</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        These are common real-world mistakes. Identify what's wrong before revealing.
        Each mistake has a real-world consequence (bad SEO, missing social previews, etc.).
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        {METADATA_BUGS.map(bug => (
          <div key={bug.id} style={{ border: '1px solid #ffcdd2', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1rem', background: '#fff5f5', borderBottom: '1px solid #ffcdd2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Bug #{bug.id}: {bug.title}</strong>
              {!revealed[bug.id] && (
                <button
                  onClick={() => setRevealed(prev => ({ ...prev, [bug.id]: true }))}
                  style={{ padding: '0.25rem 0.75rem', borderRadius: '4px', border: 'none', background: '#e53935', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Find the bug →
                </button>
              )}
            </div>
            <div style={{ padding: '0.75rem 1rem' }}>
              <pre style={{ background: '#1e1e2e', color: '#fc8888', padding: '0.75rem', borderRadius: '6px', fontSize: '0.78rem', overflow: 'auto', lineHeight: 1.6, margin: '0 0 0.75rem' }}>
                {bug.code}
              </pre>
              {revealed[bug.id] && (
                <>
                  <div style={{ padding: '0.75rem', background: '#fff5f5', borderRadius: '6px', marginBottom: '0.75rem', fontSize: '0.85rem', color: '#b71c1c', lineHeight: 1.6 }}>
                    <strong>🐛 The bug:</strong> {bug.bug}
                  </div>
                  <pre style={{ background: '#1e1e2e', color: '#a9dc76', padding: '0.75rem', borderRadius: '6px', fontSize: '0.78rem', overflow: 'auto', lineHeight: 1.6, margin: 0 }}>
                    {bug.fix}
                  </pre>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>SEO & Metadata in Next.js</h1>
    <div style={{ background: '#e8f5e9', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.9rem' }}>
      <strong>What makes this phase special:</strong> Unlike other SSR topics, metadata code is
      something you can write and reason about directly. Exercise 3's OG card builder is fully
      interactive — fill in fields and see real social card previews. The patterns here are
      directly usable in production Next.js App Router projects.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <Exercise1_WriteMetadata />
      <hr />
      <Exercise2_GenerateMetadata />
      <hr />
      <Exercise3_OGCardBuilder />
      <hr />
      <Exercise4_DebugMetadata />
    </div>
  </div>
);

export default App;
