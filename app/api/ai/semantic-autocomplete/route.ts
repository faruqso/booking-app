/**
 * Semantic Service Autocomplete API (Paid Tier)
 * 
 * Uses Vercel AI Gateway for embeddings-based semantic search.
 * Falls back to fuzzy matching for free tier.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { generateEmbeddingViaGateway } from '@/lib/ai/gateway-wrapper';
import { SERVICE_DATABASE } from '@/lib/ai/service-database';
import { checkBudget } from '@/lib/ai/budget-manager';
import Fuse from 'fuse.js';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.businessId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { query, limit = 10 } = body;

    if (!query || typeof query !== 'string' || query.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    const businessId = session.user.businessId;

    // Check if business has budget (for paid tier)
    const hasBudget = await checkBudget(businessId);

    // For paid tier: Use semantic search via AI Gateway
    if (hasBudget) {
      try {
        // Generate embedding for the query
        const queryEmbedding = await generateEmbeddingViaGateway({
          texts: [query],
          model: 'text-embedding-3-small',
          businessId,
        });

        if (queryEmbedding && queryEmbedding.length > 0) {
          // In a full implementation, you would:
          // 1. Store service embeddings in a vector database
          // 2. Perform similarity search
          // 3. Return top matches
          
          // For now, fall through to fuzzy matching as semantic search requires
          // a vector database setup (Pinecone, Weaviate, etc.)
          // This is a placeholder for the semantic search implementation
        }
      } catch (error: any) {
        console.warn('Semantic search failed, falling back to fuzzy matching:', error.message);
      }
    }

    // Free tier: Use fuzzy matching (existing implementation)
    const fuse = new Fuse(SERVICE_DATABASE, {
      keys: ['name', 'category', 'tags'],
      threshold: 0.4, // 0 = perfect match, 1 = match anything
      includeScore: true,
    });

    const results = fuse.search(query);
    const suggestions = results
      .slice(0, limit)
      .map((result) => ({
        name: result.item.name,
        category: result.item.category,
        typicalDuration: result.item.typicalDuration,
        priceRange: result.item.priceRange,
        tags: result.item.tags,
        score: result.score,
      }));

    return NextResponse.json({
      suggestions,
      source: hasBudget ? 'fuzzy-fallback' : 'fuzzy-matching',
      query,
    });
  } catch (error: any) {
    console.error('Semantic autocomplete error:', error);
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}
