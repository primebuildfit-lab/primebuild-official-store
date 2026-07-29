"use client";

/** Contact (MEGA-004 004C): canal real único; sin formularios que fingen enviar. */
export default function ContactPage() {
  return (
    <div className="pb-catdesc">
      <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
        <span className="pb-catdesc-eyebrow">Contact</span>
        <h1 className="pbsf-serif-heading">Contacto</h1>
        <p className="pb-catdesc-body">
          Escríbenos con tu número de pedido si aplica. Respondemos en horario laborable (EDT).
        </p>
        <p style={{ marginTop: 12 }}>
          <a
            className="pbsf-btn-pill"
            href="mailto:primebuildfit@gmail.com"
            style={{ background: "var(--pbsf-gold)", color: "#0a0a0a", borderColor: "var(--pbsf-gold)" }}
          >
            primebuildfit@gmail.com
          </a>
        </p>
        <p className="pb-catdesc-body" style={{ fontSize: 13, marginTop: 18 }}>
          No mostramos un formulario porque hoy no hay backend de tickets: el correo es el canal
          real. El estado de pedidos está en Order Status.
        </p>
      </div>
    </div>
  );
}
