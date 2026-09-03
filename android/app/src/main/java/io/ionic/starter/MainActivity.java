package io.ionic.starter;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Habilitar popups y JavaScript
        WebSettings webSettings = this.bridge.getWebView().getSettings();
        webSettings.setJavaScriptCanOpenWindowsAutomatically(true);
        webSettings.setMultipleWindows(true);
    }
}