"use client";

/** Soporte (§42): contacto honesto, sin backend de tickets simulado. */
export default function ShopSupportPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <h1 className="text-2xl font-bold">Soporte</h1>
      <section className="rounded-xl border border-neutral-800 p-5 text-sm text-neutral-300">
        <p>
          Escríbenos a{" "}
          <a href="mailto:primebuildfit@gmail.com" className="text-amber-400 hover:underline">
            primebuildfit@gmail.com
          </a>{" "}
          con tu número de pedido. Respondemos en horario laborable (EDT).
        </p>
        <p className="mt-3 text-xs text-neutral-500">
          Esta tienda no simula un sistema de tickets: el correo es hoy el canal real de soporte. El
          estado de tu pedido siempre está disponible en Mi cuenta.
        </p>
      </section>
    </div>
  );
}
