import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getBookBySlug, getStoreSettings } from "../../../sanity/queries";

export const prerender = false;

interface DhlRateResult {
  serviceCode: string;
  serviceName: string;
  totalCharge: number;
  currency: string;
  estimatedDaysWithBuffer: number;
  estimatedDeliveryDate: string;
}

export const GET: APIRoute = async ({ url, locals }) => {
  const bookId = url.searchParams.get("bookId");
  const country = url.searchParams.get("country");
  const city = url.searchParams.get("city") ?? "";
  const postal = url.searchParams.get("postal") ?? "";

  if (!bookId || !country) {
    return json({ success: false, error: "bookId and country required" }, 400);
  }

  try {
    // Fetch book to get weight and dimensions
    // We need the book by ID — fetch all books and find by _id (GROQ doesn't have getById by default)
    // Use a direct Sanity query approach
    const { sanityClient } = await import("../../../sanity/client");
    const book = await sanityClient.fetch(
      `*[_type == "book" && _id == $id][0]{
        formats[]{ format, weightKg, dimensionsCm }
      }`,
      { id: bookId }
    ) as { formats: Array<{ format: string; weightKg?: number; dimensionsCm?: { length: number; width: number; height: number } }> } | null;

    if (!book) return json({ success: false, error: "Book not found" }, 404);

    const physicalFmt = book.formats?.find((f) => f.format === "physical");
    if (!physicalFmt?.weightKg) {
      return json({ success: false, error: "Shipping dimensions not configured for this book" }, 400);
    }

    const settings = await getStoreSettings();
    if (!settings) return json({ success: false, error: "Store settings not configured" }, 500);

    const bufferDays = settings.dhlBufferDays ?? 3;
    const origin = {
      addressLine1: settings.dhlOriginAddressLine1,
      cityName: settings.dhlOriginCity,
      postalCode: settings.dhlOriginPostalCode,
      countryCode: settings.dhlOriginCountryCode,
    };

    const weight = physicalFmt.weightKg;
    const dims = physicalFmt.dimensionsCm ?? { length: 25, width: 20, height: 3 };

    // DHL Express Rate API
    const dhlUrl = new URL("https://express.api.dhl.com/mydhlapi/rates");
    dhlUrl.searchParams.set("accountNumber", env.DHL_ACCOUNT_NUMBER);
    dhlUrl.searchParams.set("originCountryCode", origin.countryCode);
    dhlUrl.searchParams.set("originCityName", origin.cityName);
    dhlUrl.searchParams.set("originPostalCode", origin.postalCode);
    dhlUrl.searchParams.set("destinationCountryCode", country.toUpperCase());
    dhlUrl.searchParams.set("destinationCityName", city);
    dhlUrl.searchParams.set("destinationPostalCode", postal);
    dhlUrl.searchParams.set("weight", String(weight));
    dhlUrl.searchParams.set("length", String(dims.length));
    dhlUrl.searchParams.set("width", String(dims.width));
    dhlUrl.searchParams.set("height", String(dims.height));
    dhlUrl.searchParams.set("plannedShippingDateAndTime", getNextBusinessDay());
    dhlUrl.searchParams.set("isCustomsDeclarable", "false");
    dhlUrl.searchParams.set("unitOfMeasurement", "metric");
    dhlUrl.searchParams.set("nextBusinessDay", "false");

    const dhlRes = await fetch(dhlUrl.toString(), {
      headers: {
        Authorization: "Basic " + btoa(`${env.DHL_API_KEY}:${env.DHL_API_SECRET}`),
        Accept: "application/json",
      },
    });

    if (!dhlRes.ok) {
      const err = await dhlRes.json().catch(() => ({}));
      console.error("DHL API error:", err);
      return json({ success: false, error: "Unable to get shipping rates. Please try again." }, 502);
    }

    const dhlData = await dhlRes.json() as {
      products?: Array<{
        productCode: string;
        productName: string;
        totalPrice: Array<{ price: number; priceCurrency: string }>;
        deliveryCapabilities?: { estimatedDeliveryDateAndTime?: string; totalTransitDays?: number };
      }>;
    };

    const rates: DhlRateResult[] = (dhlData.products ?? [])
      .filter((p) => p.totalPrice?.length > 0)
      .map((p) => {
        const price = p.totalPrice[0];
        const eta = p.deliveryCapabilities?.estimatedDeliveryDateAndTime;
        const transitDays = p.deliveryCapabilities?.totalTransitDays ?? 0;
        const totalDays = transitDays + bufferDays;

        const deliveryDate = eta
          ? new Date(new Date(eta).getTime() + bufferDays * 86400000).toISOString()
          : new Date(Date.now() + totalDays * 86400000).toISOString();

        return {
          serviceCode: p.productCode,
          serviceName: p.productName,
          totalCharge: Math.round(price.price * 100), // Convert to smallest unit
          currency: price.priceCurrency,
          estimatedDaysWithBuffer: totalDays,
          estimatedDeliveryDate: deliveryDate,
        };
      })
      .sort((a, b) => a.totalCharge - b.totalCharge);

    return json({ success: true, rates });
  } catch (err) {
    console.error("shipping/quote error:", err);
    return json({ success: false, error: "Failed to fetch shipping rates." }, 500);
  }
};

function getNextBusinessDay(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  // Skip weekend
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  if (d.getDay() === 6) d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10) + "T10:00:00 GMT+01:00";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
