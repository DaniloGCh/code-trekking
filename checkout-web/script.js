// -----------------------------------------------------------------
// Este Client ID es público (no es un secreto) y debe coincidir con
// environment.ts / environment.prod.ts / PAYPAL_CLIENT_ID del .env.
// Se puede sobreescribir por query param ?client_id=... si rota.
// -----------------------------------------------------------------
const DEFAULT_CLIENT_ID = 'BAAkG8JqKXqUzfnXl09GeQQLTolLDITfQ1Wz09QnQC1t9DOCfoykcXbJb5kyOUN5olr6iZ80W7zQgFppAA';

// -----------------------------------------------------------------
// 🔒 Precios oficiales por plan (misma fuente de verdad que
// pagos.page.ts / auth.service.ts). El monto a cobrar NUNCA se toma
// del query param `amount` de la URL, porque esta página se abre en
// el navegador del sistema y cualquiera puede editar la barra de
// direcciones antes de pagar. El único dato de confianza es `plan`,
// y de ahí se recalcula el precio siempre en este script.
// -----------------------------------------------------------------
const PRECIOS_CLP = {
  mensual: 4000,
  trimestral: 13350,
  anual: 39000
};

// Tasa de respaldo (CLP por 1 USD) si la API de tipo de cambio no responde.
const TASA_RESPALDO_USD = 950;

// API pública, gratuita, sin API key (open access — se actualiza 1 vez al día).
const TIPO_CAMBIO_URL = 'https://open.er-api.com/v6/latest/USD';
const TIPO_CAMBIO_TIMEOUT_MS = 5000;

/** Consulta la tasa CLP/USD real; si falla o demora, usa la de respaldo. */
function obtenerTasaClpPorUsd() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIPO_CAMBIO_TIMEOUT_MS);

  return fetch(TIPO_CAMBIO_URL, { signal: controller.signal })
    .then((resp) => {
      clearTimeout(timeoutId);
      if (!resp.ok) throw new Error(`Respuesta HTTP ${resp.status}`);
      return resp.json();
    })
    .then((data) => {
      const tasa = data && data.rates && data.rates.CLP;
      if (typeof tasa !== 'number' || !isFinite(tasa) || tasa <= 0) {
        throw new Error('Formato de respuesta inesperado (sin rates.CLP)');
      }
      return tasa;
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      console.warn('Usando tasa de cambio de respaldo por error en la API:', err);
      return TASA_RESPALDO_USD;
    });
}

const params = new URLSearchParams(window.location.search);
const planParam = params.get('plan') || 'mensual';
const plan = Object.prototype.hasOwnProperty.call(PRECIOS_CLP, planParam) ? planParam : 'mensual';
const nombre = params.get('nombre') || 'Plan';
const currency = params.get('currency') || 'USD';
const scheme = params.get('scheme') || 'codetrekking';
const clientId = params.get('client_id') || DEFAULT_CLIENT_ID;

document.getElementById('volver-link').href = `${scheme}://payment-return?status=cancel&plan=${encodeURIComponent(plan)}`;

function irApp(status, orderId, montoCobrado) {
  const url = `${scheme}://payment-return?status=${status}&plan=${encodeURIComponent(plan)}` +
    (orderId ? `&orderId=${encodeURIComponent(orderId)}` : '') +
    (montoCobrado !== undefined ? `&monto=${encodeURIComponent(montoCobrado)}` : '');
  window.location.href = url;
}

function mostrarError(msg) {
  document.getElementById('spinner').style.display = 'none';
  const box = document.getElementById('error-box');
  box.style.display = 'block';
  if (msg) box.textContent = msg;
}

// -----------------------------------------------------------------
// Primero se resuelve la tasa de cambio (con respaldo garantizado) y
// recién con el monto final se carga el SDK de PayPal y se renderiza
// el botón de pago. Así `amount` nunca queda a mitad de camino.
// -----------------------------------------------------------------
obtenerTasaClpPorUsd().then((tasaClpPorUsd) => {
  const amount = (PRECIOS_CLP[plan] / tasaClpPorUsd).toFixed(2);

  document.getElementById('plan-nombre').textContent = nombre;
  document.getElementById('plan-precio').textContent = `$${amount} ${currency}`;

  const script = document.createElement('script');
  script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}`;
  script.onload = () => {
    document.getElementById('spinner').style.display = 'none';
    window.paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' },

      createOrder: (_data, actions) => {
        return actions.order.create({
          purchase_units: [{
            description: `${nombre} ($${amount} ${currency})`,
            amount: { value: amount, currency_code: currency }
          }]
        });
      },

      onApprove: (data, actions) => {
        document.getElementById('estado').textContent = 'Confirmando pago...';

        // El pago ya quedó aprobado en este punto (PayPal ya movió el dinero).
        // No dependemos de que capture() resuelva para mostrar el botón de
        // retorno: si tarda más de 4s o se cuelga, lo mostramos igual usando
        // el orderID que el SDK ya nos entrega aquí.
        let yaMostrado = false;
        const mostrarBotonRetorno = (origen) => {
          if (yaMostrado) return;
          yaMostrado = true;

          // Intento automático: puede funcionar en algunos navegadores/versiones,
          // pero Chrome suele bloquear la navegación a un esquema personalizado
          // (codetrekking://) si no viene de un toque directo del usuario.
          irApp('success', data.orderID, amount);
          // Camino garantizado: un botón visible que el usuario toca. Un tap
          // real siempre cuenta como gesto del usuario, así que esto sí abre
          // la app aunque el intento automático de arriba haya sido bloqueado.
          document.getElementById('estado').textContent = 'Pago aprobado.';
          const boton = document.getElementById('btn-volver-exito');
          boton.style.display = 'block';
          boton.onclick = () => {
            irApp('success', data.orderID, amount);
          };
        };

        const timeoutFallback = setTimeout(() => mostrarBotonRetorno('timeout 4s'), 4000);
        return actions.order.capture().then(() => {
          clearTimeout(timeoutFallback);
          mostrarBotonRetorno('capture resuelto');
        }).catch((err) => {
          clearTimeout(timeoutFallback);
          console.error('Error al capturar la orden (el pago puede haberse aprobado igual):', err);
          mostrarBotonRetorno('capture rechazado');
        });
      },

      onCancel: () => {
        irApp('cancel');
      },

      onError: (err) => {
        console.error('Error SDK PayPal:', err);
        mostrarError('PayPal no pudo procesar el cobro. Revisa tu cuenta.');
      }
    }).render('#paypal-button-container');
  };
  script.onerror = () => mostrarError('No se pudo cargar el SDK de PayPal.');
  document.body.appendChild(script);
});
