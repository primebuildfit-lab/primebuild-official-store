import "server-only";
import { shopifyQuery } from "./shopify-client";

/**
 * Read-only queries for the PrimeBuild Official Store (Shopify Admin API).
 * Every value returned here comes straight from the live storefront. Nothing is
 * fabricated: when the store is not connected the caller renders an honest
 * "not connected" state instead of invoking these.
 */

export interface StoreOverview {
  shopName: string;
  domain: string;
  primaryUrl: string | null;
  currency: string;
  planName: string | null;
  productCount: number;
  customerCount: number;
  recentOrderCount: number;
  recentOrdersSubtotal: string;
}

export interface StoreProduct {
  id: string;
  title: string;
  status: string;
  totalInventory: number | null;
  price: string;
  currency: string;
  imageUrl: string | null;
}

export interface StoreOrder {
  id: string;
  name: string;
  createdAt: string;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  total: string;
  currency: string;
  customer: string | null;
}

export interface StoreCustomer {
  id: string;
  name: string;
  email: string | null;
  ordersCount: number;
  amountSpent: string;
  currency: string;
}

export interface StoreCollection {
  id: string;
  title: string;
  handle: string;
  productsCount: number | null;
  updatedAt: string;
}

export interface StoreDiscount {
  id: string;
  title: string;
  /** "Código" or "Automático". */
  method: string;
  /** Simplified discount kind, e.g. "Basic", "Bxgy", "FreeShipping", "App". */
  type: string;
  /** DiscountStatus: ACTIVE | EXPIRED | SCHEDULED. */
  status: string;
  startsAt: string | null;
  endsAt: string | null;
}

const gid = (id: string) => id.split("/").pop() ?? id;

export async function storeOverview(): Promise<StoreOverview> {
  const data = await shopifyQuery<{
    shop: {
      name: string;
      myshopifyDomain: string;
      primaryDomain: { url: string } | null;
      currencyCode: string;
      plan: { displayName: string } | null;
    };
    productsCount: { count: number } | null;
    customersCount: { count: number } | null;
    orders: {
      edges: Array<{ node: { totalPriceSet: { shopMoney: { amount: string } } } }>;
    };
  }>(`
    query PrimeBuildStoreOverview {
      shop {
        name
        myshopifyDomain
        primaryDomain { url }
        currencyCode
        plan { displayName }
      }
      productsCount { count }
      customersCount { count }
      orders(first: 50, sortKey: CREATED_AT, reverse: true) {
        edges { node { totalPriceSet { shopMoney { amount } } } }
      }
    }
  `);

  const recent = data.orders.edges;
  const subtotal = recent.reduce(
    (acc, e) => acc + Number(e.node.totalPriceSet.shopMoney.amount || 0),
    0,
  );

  return {
    shopName: data.shop.name,
    domain: data.shop.myshopifyDomain,
    primaryUrl: data.shop.primaryDomain?.url ?? null,
    currency: data.shop.currencyCode,
    planName: data.shop.plan?.displayName ?? null,
    productCount: data.productsCount?.count ?? 0,
    customerCount: data.customersCount?.count ?? 0,
    recentOrderCount: recent.length,
    recentOrdersSubtotal: subtotal.toFixed(2),
  };
}

export async function listProducts(limit = 50): Promise<StoreProduct[]> {
  const data = await shopifyQuery<{
    products: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          status: string;
          totalInventory: number | null;
          featuredImage: { url: string } | null;
          priceRangeV2: { minVariantPrice: { amount: string; currencyCode: string } };
        };
      }>;
    };
  }>(
    `query PrimeBuildStoreProducts($n: Int!) {
      products(first: $n, sortKey: UPDATED_AT, reverse: true) {
        edges {
          node {
            id
            title
            status
            totalInventory
            featuredImage { url }
            priceRangeV2 { minVariantPrice { amount currencyCode } }
          }
        }
      }
    }`,
    { n: limit },
  );

  return data.products.edges.map(({ node }) => ({
    id: gid(node.id),
    title: node.title,
    status: node.status,
    totalInventory: node.totalInventory,
    price: Number(node.priceRangeV2.minVariantPrice.amount).toFixed(2),
    currency: node.priceRangeV2.minVariantPrice.currencyCode,
    imageUrl: node.featuredImage?.url ?? null,
  }));
}

export async function listOrders(limit = 25): Promise<StoreOrder[]> {
  const data = await shopifyQuery<{
    orders: {
      edges: Array<{
        node: {
          id: string;
          name: string;
          createdAt: string;
          displayFinancialStatus: string | null;
          displayFulfillmentStatus: string | null;
          totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
          customer: { displayName: string | null } | null;
        };
      }>;
    };
  }>(
    `query PrimeBuildStoreOrders($n: Int!) {
      orders(first: $n, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            name
            createdAt
            displayFinancialStatus
            displayFulfillmentStatus
            totalPriceSet { shopMoney { amount currencyCode } }
            customer { displayName }
          }
        }
      }
    }`,
    { n: limit },
  );

  return data.orders.edges.map(({ node }) => ({
    id: gid(node.id),
    name: node.name,
    createdAt: node.createdAt,
    financialStatus: node.displayFinancialStatus,
    fulfillmentStatus: node.displayFulfillmentStatus,
    total: Number(node.totalPriceSet.shopMoney.amount).toFixed(2),
    currency: node.totalPriceSet.shopMoney.currencyCode,
    customer: node.customer?.displayName ?? null,
  }));
}

export async function listCustomers(limit = 25): Promise<StoreCustomer[]> {
  const data = await shopifyQuery<{
    customers: {
      edges: Array<{
        node: {
          id: string;
          displayName: string | null;
          email: string | null;
          numberOfOrders: string;
          amountSpent: { amount: string; currencyCode: string };
        };
      }>;
    };
  }>(
    `query PrimeBuildStoreCustomers($n: Int!) {
      customers(first: $n, sortKey: UPDATED_AT, reverse: true) {
        edges {
          node {
            id
            displayName
            email
            numberOfOrders
            amountSpent { amount currencyCode }
          }
        }
      }
    }`,
    { n: limit },
  );

  return data.customers.edges.map(({ node }) => ({
    id: gid(node.id),
    name: node.displayName || "—",
    email: node.email,
    ordersCount: Number(node.numberOfOrders || 0),
    amountSpent: Number(node.amountSpent.amount).toFixed(2),
    currency: node.amountSpent.currencyCode,
  }));
}

export async function listCollections(limit = 50): Promise<StoreCollection[]> {
  const data = await shopifyQuery<{
    collections: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          handle: string;
          updatedAt: string;
          productsCount: { count: number } | null;
        };
      }>;
    };
  }>(
    `query PrimeBuildStoreCollections($n: Int!) {
      collections(first: $n, sortKey: UPDATED_AT, reverse: true) {
        edges {
          node {
            id
            title
            handle
            updatedAt
            productsCount { count }
          }
        }
      }
    }`,
    { n: limit },
  );

  return data.collections.edges.map(({ node }) => ({
    id: gid(node.id),
    title: node.title,
    handle: node.handle,
    productsCount: node.productsCount?.count ?? null,
    updatedAt: node.updatedAt,
  }));
}

/** Human-facing "method" label per discount __typename (code vs automatic). */
const DISCOUNT_METHOD: Record<string, string> = {
  DiscountCodeBasic: "Código",
  DiscountCodeBxgy: "Código",
  DiscountCodeFreeShipping: "Código",
  DiscountCodeApp: "Código",
  DiscountAutomaticBasic: "Automático",
  DiscountAutomaticBxgy: "Automático",
  DiscountAutomaticFreeShipping: "Automático",
  DiscountAutomaticApp: "Automático",
};

export async function listDiscounts(limit = 50): Promise<StoreDiscount[]> {
  interface DiscountFields {
    __typename: string;
    title?: string;
    status?: string;
    startsAt?: string | null;
    endsAt?: string | null;
  }
  const data = await shopifyQuery<{
    discountNodes: {
      edges: Array<{ node: { id: string; discount: DiscountFields } }>;
    };
  }>(
    `query PrimeBuildStoreDiscounts($n: Int!) {
      discountNodes(first: $n, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            discount {
              __typename
              ... on DiscountCodeBasic { title status startsAt endsAt }
              ... on DiscountCodeBxgy { title status startsAt endsAt }
              ... on DiscountCodeFreeShipping { title status startsAt endsAt }
              ... on DiscountCodeApp { title status startsAt endsAt }
              ... on DiscountAutomaticBasic { title status startsAt endsAt }
              ... on DiscountAutomaticBxgy { title status startsAt endsAt }
              ... on DiscountAutomaticFreeShipping { title status startsAt endsAt }
              ... on DiscountAutomaticApp { title status startsAt endsAt }
            }
          }
        }
      }
    }`,
    { n: limit },
  );

  return data.discountNodes.edges.map(({ node }) => {
    const d = node.discount;
    return {
      id: gid(node.id),
      title: d.title ?? "—",
      method: DISCOUNT_METHOD[d.__typename] ?? "—",
      type: d.__typename.replace(/^Discount(Code|Automatic)/, "") || "—",
      status: d.status ?? "—",
      startsAt: d.startsAt ?? null,
      endsAt: d.endsAt ?? null,
    };
  });
}
