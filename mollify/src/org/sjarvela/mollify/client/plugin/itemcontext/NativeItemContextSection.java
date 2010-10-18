/**
 * Copyright (c) 2008- Samuli Järvelä
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html. If redistributing this code,
 * this entire header must remain intact.
 */

package org.sjarvela.mollify.client.plugin.itemcontext;

import org.sjarvela.mollify.client.ui.fileitemcontext.component.ItemContextSection;

import com.google.gwt.core.client.JavaScriptObject;

public class NativeItemContextSection extends NativeItemContextComponent
		implements ItemContextSection {
	private final String title;

	private final JavaScriptObject onOpen;
	private final JavaScriptObject onClose;

	public NativeItemContextSection(String title, String html,
			JavaScriptObject init, JavaScriptObject dispose,
			JavaScriptObject open, JavaScriptObject close) {
		super(init, dispose, html);
		this.title = title;
		onOpen = open;
		onClose = close;
	}

	@Override
	public String getTitle() {
		return title;
	}

	@Override
	public void onOpen() {
		invokeOpen();
	}

	@Override
	public void onClose() {
		invokeClose();
	}

	private final native JavaScriptObject invokeOpen() /*-{
		var cb = this.@org.sjarvela.mollify.client.plugin.itemcontext.NativeItemContextSection::onOpen;
		if (!cb) return;
		cb();
	}-*/;

	private final native JavaScriptObject invokeClose() /*-{
		var cb = this.@org.sjarvela.mollify.client.plugin.itemcontext.NativeItemContextSection::onClose;
		if (!cb) return;
		cb();
	}-*/;

}
