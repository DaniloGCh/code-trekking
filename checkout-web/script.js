// -----------------------------------------------------------------
// Este Client ID es público (no es un secreto) y debe coincidir con
// environment.ts / environment.prod.ts / PAYPAL_CLIENT_ID del .env.
// Se puede sobreescribir por query param ?client_id=... si rota.
// -----------------------------------------------------------------
const DEFAULT_CLIENT_ID = 'BAAkG8JqKXqUzfnXl09GeQQLTolLDITfQ1Wz09QnQC1t9DOCfoykcXbJb5kyOUN5olr6iZ80W7zQgFppAA';

const params = new URLSearchParams(window.location.search);
const plan = params.get('plan') || 'mensual';
const nombre = params.get('nombre') || 'Plan';
const amount = params.get('amount') || '0.00';
const currency = params.get('currency') || 'USD';
const scheme = params.get('scheme') || 'codetrekking';
const clientId = params.get('client_id') || DEFAULT_CLIENT_ID;

document.getElementById('plan-nombre').textContent = nombre;
document.getElementById('plan-precio').textContent = `$${amount} ${currency}`;
document.getElementById('volver-link').href = `${scheme}://payment-return?status=cancel&plan=${encodeURIComponent(plan)}`;

function irApp(status, orderId) {
  const url = `${scheme}://payment-return?status=${status}&plan=${encodeURIComponent(plan)}` +
    (orderId ? `&orderId=${encodeURIComponent(orderId)}` : '');
  window.location.href = url;
}

function mostrarError(msg) {
  document.getElementById('spinner').style.display = 'none';
  const box = document.getElementById('error-box');
  box.style.display = 'block';
  if (msg) box.textContent = msg;
}

// 🐞 DEBUG TEMPORAL — borrar esta función completa cuando ya no se necesite
function logDebug(msg) {
  console.log('[checkout-web]', msg);
  const log = document.getElementById('debug-log');
  if (!log) return;
  const hora = new Date().toLocaleTimeString();
  log.textContent += `[${hora}] ${msg}\n`;
  log.scrollTop = log.scrollHeight;
}
// 🐞 FIN DEBUG TEMPORAL

logDebug(`Página cargada. plan=${plan} amount=${amount} currency=${currency} scheme=${scheme}`); // 🐞 DEBUG TEMPORAL — borrar esta línea

const script = document.createElement('script');
script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}`;
script.onload = () => {
  logDebug('SDK de PayPal cargado.'); // 🐞 DEBUG TEMPORAL — borrar esta línea
  document.getElementById('spinner').style.display = 'none';
  window.paypal.Buttons({
    style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' },

    createOrder: (_data, actions) => {
      logDebug('createOrder llamado.'); // 🐞 DEBUG TEMPORAL — borrar esta línea
      return actions.order.create({
        purchase_units: [{
          description: `${nombre} ($${amount} ${currency})`,
          amount: { value: amount, currency_code: currency }
        }]
      });
    },

    onApprove: (data, actions) => {
      logDebug(`onApprove disparado. orderID=${data.orderID}`); // 🐞 DEBUG TEMPORAL — borrar esta línea
      document.getElementById('estado').textContent = 'Confirmando pago...';

      // El pago ya quedó aprobado en este punto (PayPal ya movió el dinero).
      // No dependemos de que capture() resuelva para volver a la app: si tarda
      // más de 4s o se cuelga (algo que puede pasar en el navegador in-app),
      // volvemos igual usando el orderID que el SDK ya nos entrega aquí.
      let yaVolvio = false;
      const volverConExito = (origen) => {
        logDebug(`Volviendo a la app (origen: ${origen}).`); // 🐞 DEBUG TEMPORAL — borrar esta línea
        if (yaVolvio) return;
        yaVolvio = true;
        irApp('success', data.orderID);
      };

      const timeoutFallback = setTimeout(() => volverConExito('timeout 4s'), 4000);

      return actions.order.capture().then(() => {
        clearTimeout(timeoutFallback);
        volverConExito('capture resuelto');
      }).catch((err) => {
        clearTimeout(timeoutFallback);
        logDebug(`capture() rechazado: ${err && err.message ? err.message : err}`); // 🐞 DEBUG TEMPORAL — borrar esta línea
        console.error('Error al capturar la orden (el pago puede haberse aprobado igual):', err);
        volverConExito('capture rechazado');
      });
    },

    onCancel: () => {
      logDebug('onCancel disparado.'); // 🐞 DEBUG TEMPORAL — borrar esta línea
      irApp('cancel');
    },

    onError: (err) => {
      logDebug(`onError disparado: ${err && err.message ? err.message : err}`); // 🐞 DEBUG TEMPORAL — borrar esta línea
      console.error('Error SDK PayPal:', err);
      mostrarError('PayPal no pudo procesar el cobro. Revisa tu cuenta sandbox.');
    }
  }).render('#paypal-button-container');
};
script.onerror = () => mostrarError('No se pudo cargar el SDK de PayPal.');
document.body.appendChild(script);