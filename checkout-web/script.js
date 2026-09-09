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

        onApprove: (_data, actions) => {
          document.getElementById('estado').textContent = 'Confirmando pago...';
          return actions.order.capture().then((orden) => {
            irApp('success', orden.id);
          }).catch((err) => {
            console.error('Error al capturar la orden:', err);
            mostrarError('El pago fue aprobado pero no se pudo confirmar. Intenta nuevamente.');
          });
        },

        onCancel: () => irApp('cancel'),

        onError: (err) => {
          console.error('Error SDK PayPal:', err);
          mostrarError('PayPal no pudo procesar el cobro. Revisa tu cuenta sandbox.');
        }
      }).render('#paypal-button-container');
    };
    script.onerror = () => mostrarError('No se pudo cargar el SDK de PayPal.');
    document.body.appendChild(script);
