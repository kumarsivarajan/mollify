package org.sjarvela.mollify.client.ui;

import com.google.gwt.user.client.DOM;
import com.google.gwt.user.client.Element;
import com.google.gwt.user.client.Event;
import com.google.gwt.user.client.ui.PopupPanel;

public class DropdownPopup extends PopupPanel {
	private Element parent;
	private Element opener;

	boolean cancelShow = false;

	public DropdownPopup(Element parent, Element opener) {
		super(true);

		this.opener = opener;
		this.parent = parent;
	}

	@Override
	public void show() {
		if (cancelShow) {
			cancelShow = false;
			return;
		}

		if (parent != null)
			setPopupPosition(parent.getAbsoluteLeft(), parent.getAbsoluteTop()
					+ parent.getOffsetHeight());

		super.show();
		onShow();
	}

	protected void onShow() {
	}

	public Element getParentElement() {
		return parent;
	}

	public void setParentElement(Element parent) {
		this.parent = parent;
	}

	public Element getOpenerElement() {
		return opener;
	}

	public void setOpenerElement(Element opener) {
		this.opener = opener;
	}

	@Override
	public boolean onEventPreview(Event event) {
		int type = DOM.eventGetType(event);
		Element target = DOM.eventGetTarget(event);

		if (type == Event.ONMOUSEDOWN && target != null && opener != null) {
			boolean eventTargetsOpener = DOM.isOrHasChild(opener, target);

			if (eventTargetsOpener) {
				hide(true);
				cancelShow = true;
				return false;
			}
		}

		return super.onEventPreview(event);
	}
}
