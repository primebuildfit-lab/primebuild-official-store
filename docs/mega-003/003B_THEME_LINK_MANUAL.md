# 003B — Enlace manual en el theme Shopify (NUNCA publicación automática)

Preparado para pegar A MANO en el theme (duplicado 137989980368 y publicar
manualmente, como siempre): snippet de PDP que muestra
«Available in PrimeBuild Official Store» SOLO si el producto lleva el tag
`propio` (tu tag existente de inventario físico — la colección
`inventario-propio` ya lo usa). El tag lo gestionas tú: es el proxy del
requisito «owned stock > 0 y elegible» hasta que exista canal de datos.

```liquid
{% comment %} PB Official Store availability — pegar en sections/pb-product o snippet del PDP {% endcomment %}
{% if product.tags contains 'propio' %}
  <div class="pb-official-store-note" style="margin:14px 0;padding:12px 16px;border:1px solid #c9a227;border-radius:8px;background:rgba(201,162,39,0.08);">
    <span style="color:#c9a227;font-weight:700;font-size:13px;letter-spacing:0.05em;text-transform:uppercase;">
      ⚡ Available in PrimeBuild Official Store
    </span>
    <p style="margin:6px 0 0;font-size:12.5px;color:#b8b8b0;">
      Stock físico propio con envío rápido y precio principal en PB.
    </p>
  </div>
{% endif %}
```

Checklist manual: Online Store → Themes → duplicado → Edit code → pegar →
previsualizar → **Publish manual** (el conector tiene el publish bloqueado
por diseño).
