package org.sjarvela.mollify.client.service.json;

import org.sjarvela.mollify.client.service.ServiceError;

import com.google.gwt.core.client.GWT;
import com.google.gwt.core.client.JavaScriptObject;

public class JsonRpcHandler {
	private static int requestId = 0;
	private JsonRpcListener listener;
	private String url;
	private int id;

	public JsonRpcHandler(String url, JsonRpcListener listener) {
		this.listener = listener;
		this.url = url;
		this.id = requestId++;
	}

	public void doRequest() {
		getExternalJson(id, url + "&callback=", this);
	}

	public void handleResponse(JavaScriptObject jso) {
		if (jso == null) {
			handleError(ServiceError.INVALID_RESPONSE.ordinal());
			return;
		}
		listener.onSuccess(jso);
	}
	
	public void handleError(int error) {
		GWT.log("Json request failed: id=" + id + " url=" + url + " msg=" + error, null);
		listener.onFailure(ServiceError.values()[error]);
	}

	private native static void getExternalJson(int requestId, String url,
			JsonRpcHandler handler) /*-{
	    var callback = "callback" + requestId;
	    
	    var script = document.createElement("script");
	    script.setAttribute("src", url+callback);
	    script.setAttribute("type", "text/javascript");
	
	    window[callback] = function(jsonObj) {
	      window[callback + "done"] = true;
	      handler.@org.sjarvela.mollify.client.service.JsonRpcHandler::handleResponse(Lcom/google/gwt/core/client/JavaScriptObject;)(jsonObj);
	    }
	    
	    setTimeout(function() {
	      if (!window[callback + "done"]) {
	        handler.@org.sjarvela.mollify.client.service.JsonRpcHandler::handleError(I)(0);
	      } 
	
	      // cleanup
	      document.body.removeChild(script);
	      delete window[callback];
	      delete window[callback + "done"];
	    }, 2000);
	    
	    document.body.appendChild(script);
	}-*/;
}
