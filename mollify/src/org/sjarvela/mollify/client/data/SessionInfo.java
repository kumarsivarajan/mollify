/**
 * Copyright (c) 2008- Samuli Järvelä
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html. If redistributing this code,
 * this entire header must remain intact.
 */

package org.sjarvela.mollify.client.data;

import com.google.gwt.core.client.JavaScriptObject;

public class SessionInfo extends JavaScriptObject {
	protected SessionInfo() {
	}

	public final native boolean isAuthenticationRequired() /*-{
		return this.authentication_required;
	}-*/;

	public final native boolean getAuthenticated() /*-{
		return this.authenticated;
	}-*/;

	public final native String getLoggedUser() /*-{
		return this.user;
	}-*/;

	public final native SessionSettings getSettings() /*-{
		return this.settings;
	}-*/;
}
