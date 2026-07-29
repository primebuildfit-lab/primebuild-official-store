"use client";

/** About PrimeBuild (MEGA-004 004C): la marca real, sin testimonios inventados. */
export default function AboutPage() {
  return (
    <div className="pb-catdesc">
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <span className="pb-catdesc-eyebrow">About</span>
        <h1 className="pbsf-serif-heading" style={{ textAlign: "left" }}>
          PrimeBuild
        </h1>
        <p className="pb-catdesc-body">
          Premium gear. Proven results. Built for your performance. This is more than a brand —
          it&apos;s your lifestyle.
        </p>
        <p className="pb-catdesc-body">
          PrimeBuild nació como tienda de equipamiento fitness (primebuildfit.com) y está dando el
          salto a inventario físico propio: comprar bien, almacenar bien y enviar rápido, con un
          sistema de valor propio (PB) construido sobre reglas públicas y verificables — sin números
          inventados en ninguna parte de la experiencia.
        </p>
        <p className="pb-catdesc-body" style={{ fontStyle: "italic" }}>
          Built different. Built to last.
        </p>
      </div>
    </div>
  );
}
