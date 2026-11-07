import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import {
  OwnerProfile,
  persistOwnerImage,
  readSiteInfo,
  writeSiteInfo,
} from "@/lib/siteInfo";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("furious_session")?.value;
  if (!token) return null;
  const user = verifySessionToken(token);
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function GET() {
  const siteInfo = readSiteInfo();
  return NextResponse.json(siteInfo, { status: 200 });
}

export async function PUT(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const current = readSiteInfo();

    if (body.about && typeof body.about === "object") {
      const a = body.about;
      const incomingOwners: OwnerProfile[] = Array.isArray(a.owners)
        ? a.owners.slice(0, 4).map((o: Partial<OwnerProfile>, idx: number) => ({
            id: o.id || `owner-${idx + 1}`,
            image: persistOwnerImage(o.image || ""),
            name: typeof o.name === "string" ? o.name.trim() : "",
            designation:
              typeof o.designation === "string" ? o.designation.trim() : "",
            email: typeof o.email === "string" ? o.email.trim() : "",
          }))
        : current.about.owners;

      while (incomingOwners.length < 4) {
        incomingOwners.push({
          id: `owner-${incomingOwners.length + 1}`,
          image: "",
          name: `Owner ${incomingOwners.length + 1}`,
          designation: "Co-Founder & Owner",
          email: "",
        });
      }

      current.about = {
        tagline:
          typeof a.tagline === "string" ? a.tagline.trim() : current.about.tagline,
        description:
          typeof a.description === "string"
            ? a.description.trim()
            : current.about.description,
        mission:
          typeof a.mission === "string" ? a.mission.trim() : current.about.mission,
        vision:
          typeof a.vision === "string" ? a.vision.trim() : current.about.vision,
        whyChooseUs:
          typeof a.whyChooseUs === "string"
            ? a.whyChooseUs.trim()
            : current.about.whyChooseUs,
        establishedYear:
          typeof a.establishedYear === "string"
            ? a.establishedYear.trim()
            : current.about.establishedYear,
        owners: incomingOwners,
      };
    }

    if (body.contact && typeof body.contact === "object") {
      const c = body.contact;
      current.contact = {
        shopName:
          typeof c.shopName === "string"
            ? c.shopName.trim()
            : current.contact.shopName,
        address:
          typeof c.address === "string"
            ? c.address.trim()
            : current.contact.address,
        primaryPhone:
          typeof c.primaryPhone === "string"
            ? c.primaryPhone.trim()
            : current.contact.primaryPhone,
        secondaryPhone:
          typeof c.secondaryPhone === "string"
            ? c.secondaryPhone.trim()
            : current.contact.secondaryPhone,
        whatsapp:
          typeof c.whatsapp === "string"
            ? c.whatsapp.trim()
            : current.contact.whatsapp,
        email:
          typeof c.email === "string" ? c.email.trim() : current.contact.email,
        supportEmail:
          typeof c.supportEmail === "string"
            ? c.supportEmail.trim()
            : current.contact.supportEmail,
        businessHours:
          typeof c.businessHours === "string"
            ? c.businessHours.trim()
            : current.contact.businessHours,
        facebookUrl:
          typeof c.facebookUrl === "string"
            ? c.facebookUrl.trim()
            : current.contact.facebookUrl,
        instagramUrl:
          typeof c.instagramUrl === "string"
            ? c.instagramUrl.trim()
            : current.contact.instagramUrl,
        mapLocation:
          typeof c.mapLocation === "string"
            ? c.mapLocation.trim()
            : current.contact.mapLocation,
        additionalNote:
          typeof c.additionalNote === "string"
            ? c.additionalNote.trim()
            : current.contact.additionalNote,
      };
    }

    if (body.policies && typeof body.policies === "object") {
      const p = body.policies;
      current.policies = {
        lastUpdated:
          typeof p.lastUpdated === "string" && p.lastUpdated.trim()
            ? p.lastUpdated.trim()
            : new Date().toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              }),
        sections: Array.isArray(p.sections)
          ? p.sections.map((s: { title?: string; description?: string }) => ({
              title: typeof s.title === "string" ? s.title.trim() : "",
              description:
                typeof s.description === "string" ? s.description.trim() : "",
            }))
          : current.policies?.sections || [],
      };
    }

    writeSiteInfo(current);
    return NextResponse.json(
      { ...current, message: "Saved successfully." },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }
}

