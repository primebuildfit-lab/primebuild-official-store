# Product Builder — definición normativa

**Control:** `PB-BLD-001` · **Estado:** vigente · **Fecha:** 2026-07-19

Esta es la **única** definición de Product Builder. No la repitas en otros documentos: enlázala.

---

## 1. Definición

> Un **Product Builder** es una aplicación cuya responsabilidad es **crear, diseñar, configurar, administrar, analizar, publicar y evolucionar un producto digital completo**.
>
> Ese producto puede representarse posteriormente como sitio web, como aplicación, o como ambos.

## 2. Relación con *Group Vision*

Product Builder **no es una categoría nueva**. Es el nombre concreto que recibe, dentro de PrimeBuild, la categoría **Constructor** que ya define *Group Vision* (capítulo 4):

> *"Son las aplicaciones administrativas que no son Internal OS. Su función es construir productos. No son los productos. […] Desde el constructor se define qué existe, cómo se comporta y bajo qué condiciones. El resultado se propaga después hacia el cliente."*

Se usa el término "Product Builder" porque describe con más precisión el alcance —el producto **completo**, no solo su catálogo— pero la categoría arquitectónica sigue siendo la misma, y las reglas de *Ecosystem Architecture Principles* sobre constructores (`C3.1`, `C3.2`, `C3.3`, `C4.1`, `C4.2`, `C4.3`) aplican sin excepción.

**Si esta definición y *Group Vision* llegaran a discrepar, prevalece *Group Vision*.**

## 3. Aplicación a PrimeBuild

```
PrimeBuild Internal OS          administra LA EMPRESA
        │
        ▼
PrimeBuild Official Store       PRODUCT BUILDER del canal comercial
        │
        ▼
PrimeBuild Store                el PRODUCTO construido y administrado desde él
      ├── Sitio web
      ├── Aplicación futura
      ├── Catálogo
      ├── Checkout
      ├── Experiencia del cliente
      └── Todos los canales públicos
```

### PrimeBuild Official Store **no es**

- la tienda;
- el storefront;
- el producto que usa el cliente;
- un panel administrativo sin más.

### PrimeBuild Official Store **es**

El Product Builder del canal comercial de PrimeBuild. Su responsabilidad es diseñar, configurar, administrar, analizar, publicar y evolucionar **todo** el producto comercial: catálogo, navegación, branding, estructura comercial, páginas, colecciones, productos, reglas de negocio, impuestos, automatizaciones, campañas, canales, SEO, integraciones, analítica, configuración, experiencia del cliente, publicación y evolución del producto.

No es una herramienta para editar productos. Es el entorno donde se construye PrimeBuild Store.

### PrimeBuild Store

**No es un proyecto independiente.** Arquitectónicamente es el producto generado y administrado por el Product Builder.

Puede existir código, una web, una aplicación o un storefront. Todo ello pertenece al Builder y no constituye una línea de producto propia. Es lo que `C4.2` exige de todo Client: debe poder regenerarse desde su constructor, y no acumular una definición propia que empiece a divergir.

## 4. Consecuencias que se derivan

**El Builder se diseña para el operador, nunca para el cliente** (`C3.3`). Ante una disyuntiva, decide la necesidad del operador. Que el cliente no lo entendería es irrelevante: el cliente no entra aquí.

**La lógica vive en el Builder** (`C4.3`). Ninguna regla de negocio ni decisión de producto se define dentro del producto final. Si algo debe cambiar para el cliente, se cambia aquí.

**El cliente nunca ve el Builder** (`C4.1`). Si un cliente accede a él, es un defecto arquitectónico, no una funcionalidad.

## 5. Distancia entre la definición y la implementación actual

Esta sección existe porque la definición anterior describe **lo que esta aplicación es arquitectónicamente**, y no coincide todavía con lo que la aplicación **hace hoy**.

| | |
|---|---|
| **Definición** | crea, diseña, configura, administra, publica y evoluciona el producto |
| **Implementación hoy** | **estrictamente de solo lectura** |

`src/server/integrations/store/shopify-client.ts` rechaza toda mutación antes de que salga del proceso (`assertReadOnly`), y el token de acceso está documentado como de solo lectura.

Es decir: **el rol declarado exige escribir; la implementación no puede.** Es deuda arquitectónica declarada, no un defecto oculto, y se registra aquí para que nadie deduzca capacidades a partir del nombre.

`PB-BLD-001` prohíbe expresamente implementar funcionalidades, así que **no se ha tocado ese comportamiento**. Cerrar esta distancia depende además de `C-3` —quién posee la relación con Shopify—, que sigue congelado esperando decisión del propietario: hoy los permisos de escritura los tiene `priembuild-core`, no este Builder.

Mientras tanto, la documentación de esta app debe describir **qué es** sin atribuirse capacidades que no tiene. Un Builder que aún no puede escribir es un Builder incompleto, no una tienda.
