package com.example.chris.soilmonitor.Misc;

import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Created by chris on 07/06/18.
 */

public class EmbeddedWebViewClient extends WebViewClient {
    @Override
    public boolean shouldOverrideUrlLoading(WebView view, String url) {
        view.loadUrl(url);
        return true;
    }
}