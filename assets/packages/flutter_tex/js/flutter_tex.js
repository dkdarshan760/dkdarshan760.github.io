"use strict";
var currentUrl = location.protocol + '//' + location.host;
var isWeb = true;
var teXView;

function initTeXView(jsonData) {
    teXView.appendChild(createTeXView(jsonData));
    renderTeXView(renderCompleted, jsonData['configurations']);
}

function initWebTeXView(viewId, rawData) {
    var initiated = false;
    document.querySelectorAll("flt-platform-view").forEach(function (platformView) {
            var view = platformView.shadowRoot.children[1];
            if (view.id === viewId) {
                var iframe = view.contentWindow;
                if (iframe != null) {
                    teXView = iframe.document.getElementById('TeXView');
                    if (teXView != null) {
                        initiated = true;
                        var jsonData = JSON.parse(rawData);
                        teXView.appendChild(createTeXView(jsonData));
                        iframe.renderTeXView(renderCompleted, jsonData['configurations']);
                    }
                }
            }
        }
    );
    if (!initiated) setTimeout(function () {
        initWebTeXView(viewId, rawData)
    }, 250);
}


function createTeXView(viewData) {
    var meta = viewData['meta'];
    var data = viewData['data'];
    var classList = meta['classList'];
    var element = document.createElement(meta['tag']);
    element.classList.add(classList);
    element.setAttribute('style', viewData['style']);
    switch (meta['node']) {
        case 'leaf': {
            if (meta['tag'] === 'img') {
                if (classList === 'tex-view-asset-image') {
                    element.setAttribute('src', getAssetsUri() + data);
                } else {
                    element.setAttribute('src', data);
                    element.addEventListener("load", renderCompleted);
                }
            } else {
                element.innerHTML = data;
            }
        }
            break;
        case 'internal_child': {
            element.appendChild(createTeXView(data))
            var id = viewData['id'];
            if (classList === 'tex-view-ink-well' && id != null) clickManager(element, id, viewData['rippleEffect']);
        }
            break;
        case 'root':
            viewData['fonts'].forEach(function (font) {
                registerFont(font['font_family'], font['src'])
            })
            element.appendChild(createTeXView(data));
            break;
        default: {
            if (classList === 'tex-view-group') {
                createTeXViewGroup(element, data, viewData['rippleEffect'], viewData['normalItemStyle'], viewData['selectedItemStyle']);
            } else {
                data.forEach(function (childViewData) {
                    element.appendChild(createTeXView(childViewData))
                });
            }
        }
    }
    return element;
}

function createTeXViewGroup(groupElement, groupData, rippleEffect, normalStyle, selectedStyle) {
    var lastSelected;
    groupData.forEach(function (data) {
        data['style'] = normalStyle;
        var item = createTeXView(data);
        var id = data['id'];
        item.setAttribute('id', id);
        clickManager(item, id, rippleEffect, function (clickedId) {
            if (clickedId === id) {
                if (lastSelected != null) lastSelected.setAttribute('style', normalStyle);
                item.setAttribute('style', selectedStyle);
                lastSelected = item;
            }
            renderCompleted();
        })
        groupElement.appendChild(item);
    });
}


function renderCompleted() {
    if (isWeb) {
        // noinspection JSUnresolvedFunction
        RenderedTeXViewHeight(getTeXViewHeight());
    } else {
        // noinspection JSUnresolvedVariable
        RenderedTeXViewHeight.postMessage(getTeXViewHeight());
    }

}

function pageLoaded() {
    // noinspection JSUnresolvedVariable
    LoadData.postMessage("Page has been loaded...!");
}

function clickManager(element, id, rippleEffect, callback) {
    element.addEventListener('click', function (e) {
        if (callback != null) callback(id);
        if (isWeb) {
            // noinspection JSUnresolvedFunction
            OnTapCallback(id);
        } else {
            // noinspection JSUnresolvedVariable
            OnTapCallback.postMessage(id);
        }
        if (rippleEffect) {
            var ripple = document.createElement('div');
            this.appendChild(ripple);
            var d = Math.max(this.clientWidth, this.clientHeight);
            ripple.style.width = ripple.style.height = d + 'px';
            var rect = this.getBoundingClientRect();
            ripple.style.left = e.clientX - rect.left - d / 2 + 'px';
            ripple.style.top = e.clientY - rect.top - d / 2 + 'px';
            ripple.classList.add('ripple');
        }
    });
}


function getTeXViewHeight() {
    var element = document.body;
    var height = element.offsetHeight,
        style = window.getComputedStyle(element)
    return ['top', 'bottom']
        .map(function (side) {
            return parseInt(style["margin-" + side]);
        })
        .reduce(function (total, side) {
            return total + side;
        }, height)
}

function registerFont(fontFamily, src) {
    var registerFont =
        ' @font-face {                               \n' +
        '   font-family: ' + fontFamily + ';         \n' +
        '   src: url(' + getAssetsUri() + src + ');  \n' +
        ' }';
    appendStyle(registerFont);
}

function getAssetsUri() {
    var uri;
    if (isWeb) {
        uri = currentUrl + '/assets/';
    } else {
        uri = currentUrl + '/';
    }
    return uri
}

function appendStyle(content) {
    var style = document.createElement('STYLE');
    style.type = 'text/css';
    style.appendChild(document.createTextNode(content));
    document.head.appendChild(style);
}