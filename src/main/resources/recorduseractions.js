if(document.readyState === 'complete') {
    /* Wait just in case that Vaadin is executing some Javascript. */
    setTimeout(executeFormScript, 500);
}
else {
    window.addEventListener('load',  setTimeout(executeFormScript, 500));
}

function executeFormScript() {
    /* Global variables */
    var order = 1;
    var form = {
        name: 'form1',
        applicationUrl: window.location.href,
        elements: []
    };
    var allElements;
    var route;
    var lastSelectedElement;
    var isRecordingRoute = false;

    /* Load available elements. */
    function initAvailableElements() {
        /* Query elements in shadow root. */
        var style = document.createElement('style');
        style.innerHTML = '.formClickable:hover {cursor: pointer !important; border: 2px solid rgba(255, 147, 104, 0.47);} ' +
            '.form_selected {border: 2px solid #ff9368;} '+
            '.element_selected {border-width: 4px !important; box-shadow: 0 0 2px 2px #ff9368;}';

        var allNodes = document.getElementsByTagName('*');
        for (var i = 0; i < allNodes.length; i++) {
            if(allNodes[i].shadowRoot) {
                allNodes[i].shadowRoot.appendChild(style);

                allNodes[i].shadowRoot.querySelectorAll(Object.keys(allElements)).forEach(function (element) {
                        element.classList.add('formClickable');
                        element.addEventListener('click', handler, true);
                     }
                );
            }
        }

        /* Query normal elements. */
        document.querySelectorAll(Object.keys(allElements)).forEach(function (element) {
                element.classList.add('formClickable');
            }
        );
    }

    var xmlReq = new XMLHttpRequest();
    xmlReq.open('get', 'http://localhost:8087/getAvailableElements');
    xmlReq.onreadystatechange = function () {
        if (xmlReq.readyState === 4) {
            allElements = JSON.parse(xmlReq.responseText);
            initAvailableElements();
        }
    };
    xmlReq.send();

    /* Add toolbar as shadow DOM */
    var toolbar = document.createElement('div');
    toolbar.setAttribute('id', 'formToolbar');
    toolbar.attachShadow({mode: "open"});
    toolbar.shadowRoot.innerHTML = '<style>button {background-color: #8EF5DC;border: #667370 1px solid;color: black;padding: 5px;text-align: center;text-decoration: none;}' +
        '#tbForm{padding-top: 7px;padding-bottom: 7px;}' +
        'input {margin-right: 10px}' +
        'label,button {margin-right: 5px}</style>'+
        '<div id=\'tbRoute\'><button id=\'btnRecordRoute\'>Record route</button><button id=\'btnStopRecordRoute\' disabled>Stop recording route</button></div>' +
        '<div id=\'tbForm\'><input type=\'text\' id=\'iptFormname\'><button id=\'btnToolbarSubmit\'>Save form</button></div>' +
        '<div id=\'tbElement\'><input type=\'hidden\' id=\'iptIdx\'><label for=\'iptParameter\'>Parameter</label><input type=\'text\' id=\'iptParameter\'>' +
        '<label for=\'iptDefaultVal\'>Default value</label><input type=\'text\' id=\'iptDefaultVal\'><button id=\'btnExcludeElement\'>Exclude Element</button><p id=\'elementMessage\'></p></div>';
    document.body.insertBefore(toolbar, document.body.firstChild);

    var btnRecordRoute = toolbar.shadowRoot.querySelector('#btnRecordRoute');
    var btnStopRecordRoute = toolbar.shadowRoot.querySelector('#btnStopRecordRoute');
    var btnToolbarSubmit = toolbar.shadowRoot.querySelector('#btnToolbarSubmit');
    var btnExcludeElement = toolbar.shadowRoot.querySelector('#btnExcludeElement');
    var iptFormname = toolbar.shadowRoot.querySelector('#iptFormname');
    var iptIdx = toolbar.shadowRoot.querySelector('#iptIdx');
    var iptParameter = toolbar.shadowRoot.querySelector('#iptParameter');
    var iptDefaultVal = toolbar.shadowRoot.querySelector('#iptDefaultVal');
    var elementMessage = toolbar.shadowRoot.querySelector('#elementMessage');

    /* Add toolbar actions */
    btnRecordRoute.addEventListener('click', recordRoute);
    btnStopRecordRoute.addEventListener('click', stopRecordingRoute);
    btnToolbarSubmit.addEventListener('click', saveForm);
    btnExcludeElement.addEventListener('click', excludeElement);
    iptDefaultVal.addEventListener('change', modifyElement);
    iptParameter.addEventListener('change', modifyElement);

    /* Toolbar functions */
    function recordRoute() {
        isRecordingRoute = true;

        btnRecordRoute.disabled = true;
        btnStopRecordRoute.disabled = false;
        btnToolbarSubmit.disabled = true;
        btnExcludeElement.disabled = true;
        iptDefaultVal.disabled = true;
        iptParameter.disabled = true;
    }

    function stopRecordingRoute() {
        route = form.elements;
        isRecordingRoute = false;

        elementMessage.innerHTML = 'Route is recorded and will be added to every form.';
        btnRecordRoute.disabled = true;
        btnStopRecordRoute.disabled = true;
        btnToolbarSubmit.disabled = false;
        btnExcludeElement.disabled = false;
        iptDefaultVal.disabled = false;
        iptParameter.disabled = false;
    }

    function saveForm() {
        /* Delete null elements */
        form.elements = form.elements.filter(function (el) {
            return el != null;
        });

        form.name = iptFormname.value;

        /* Send request to backend. */
        var xmlReq = new XMLHttpRequest();
        xmlReq.open('post', 'http://localhost:8087/addForm');
        xmlReq.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        xmlReq.send(JSON.stringify(form));

        /* Clear input fields. */
        iptFormname.value = '';
        iptParameter.value = '';
        iptDefaultVal.value = '';
        elementMessage.innerHTML = '';

        /* Reset form */
        form = {
            name: 'form1',
            applicationUrl: window.location.href,
            elements: []
        };
        form.elements.push(route);

        /* Delete highlights */
        if (lastSelectedElement != null) {
            lastSelectedElement.classList.remove('element_selected');
        }
        lastSelectedElement = null;

        var allNodes = document.getElementsByTagName('*');
        for (var i = 0; i < allNodes.length; i++) {
            if(allNodes[i].shadowRoot) {
                allNodes[i].shadowRoot.querySelectorAll('.form_selected').forEach(function (element) {
                        console.log(element);
                        element.classList.remove('form_selected');
                    }
                );
            }
        }
        var elements = document.getElementsByClassName('form_selected');
        while (elements.length > 0) {
            elements[0].classList.remove('form_selected');
        }
    }

    function excludeElement() {
        var idx = iptIdx.value;
        /* Set element = null so that the indices of the other elements are not changed */
        form.elements[idx] = null;
        /* Delete highlight */
        lastSelectedElement.classList.remove('form_selected', 'element_selected');
        lastSelectedElement = null;

        iptParameter.value = '';
        iptDefaultVal.value = '';

        elementMessage.innerHTML = 'Element was successfully excluded!';
    }

    function modifyElement() {
        var idx = iptIdx.value;
        form.elements[idx].parameter = iptParameter.value;
        form.elements[idx].defaultValue = iptDefaultVal.value;
    }

    /* Add click functionality */
    document.addEventListener('click', handler, true);

    function handleSelection(e) {
        /* As soon as one element is added, a route cannot be recorded anymore. */
        btnRecordRoute.disabled = true;

        /* Check if Element can be processed */
        if (e.target.classList.contains('formClickable')) {
            /* Prevent any other click events. */
            e.stopPropagation();
            e.preventDefault();

            /* Highlight element and delete highlight of last element*/
            if (lastSelectedElement != null) {
                lastSelectedElement.classList.remove('element_selected');
            }
            e.target.classList.add('element_selected');
            lastSelectedElement = e.target;

            var idx;

            /* Check if element is already added. */
            if (e.target.classList.contains('form_selected')) {
                idx = e.target.getAttribute('data-formidx');
            } else {
                /* Color element. */
                e.target.classList.add('form_selected');

                /* Add element to form. */
                idx = addElementToForm(e);

                /* Save index. */
                e.target.setAttribute('data-formidx', idx);

            }

            /* Load data into toolbar */
            iptParameter.value = form.elements[idx].parameter;
            iptDefaultVal.value = form.elements[idx].defaultValue;
            iptIdx.value = idx;
            elementMessage.innerHTML = '';
        }
    }

    function handleRoute(e) {
        /* Check if Element can be processed */
        if (e.target.classList.contains('formClickable')) {
            addElementToForm(e);
            setTimeout(function() {
                /* Wait shortly until new site is loaded. */
                initAvailableElements();
                btnStopRecordRoute.addEventListener('click', stopRecordingRoute);
                document.addEventListener('click', handler, true);
            }, 2500);
        }
    }

    function addElementToForm(e) {
        /* Add element to form. */
        var nodes;
        var pos;

        var shadowRoute = [];
        var shadowRootNode = e.target.getRootNode().host;
        if(typeof shadowRootNode !== 'undefined') {
            /* Element is in Shadow Dom. Record route. */
            nodes = Array.prototype.slice.call(shadowRootNode.shadowRoot.querySelectorAll(e.target.tagName.toLowerCase()));
            pos = nodes.indexOf(e.target);

            var sPos;
            var shadowRootNodeParent = shadowRootNode.getRootNode().host;
            /* Loop through shadow roots until document is reached. */
            while(typeof shadowRootNodeParent !== 'undefined') {
                nodes = Array.prototype.slice.call(shadowRootNodeParent.shadowRoot.querySelectorAll(shadowRootNode.tagName.toLowerCase()));
                sPos = nodes.indexOf(shadowRootNode);
                shadowRoute.push({'tag': shadowRootNode.tagName.toLowerCase(), 'pos': sPos});
            }
            nodes = Array.prototype.slice.call(document.querySelectorAll(shadowRootNode.tagName.toLowerCase()));
            sPos = nodes.indexOf(shadowRootNode);
            shadowRoute.push({'tag': shadowRootNode.tagName.toLowerCase(), 'pos': sPos});

        }
        else {
            /* No shadow element, that's easy. */
            nodes = Array.prototype.slice.call(document.querySelectorAll(e.target.tagName.toLowerCase()));
            pos = nodes.indexOf(e.target);
        }

        /* Add element to form. */
        var idx = form.elements.length;
        var val = "";

        if (allElements[e.target.tagName.toLowerCase()]) {
            val = allElements[e.target.tagName.toLowerCase()]
        }

        var element = {
            htmltag: e.target.tagName.toLowerCase(),
            position: pos,
            orderpos: order++,
            parameter: 'parameter' + idx,
            defaultValue: val,
            shadowRoute : shadowRoute
        };

        form.elements.push(element);
        return idx;
    }

    function handler(e) {
        /* Exclude toolbar */
        if (!document.getElementById('formToolbar').contains(e.target)) {
            if (isRecordingRoute) {
                handleRoute(e);
            } else {
                handleSelection(e);
            }
        }
    }
}