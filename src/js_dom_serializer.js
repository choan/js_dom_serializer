var JsDomSerializer = function () {
  this.filters = [];
};

/**
 * The list of fixeable attributes
 */
JsDomSerializer.props = {
	"for": "htmlFor",
	"class": "className",
	readonly: "readOnly",
	maxlength: "maxLength",
	cellspacing: "cellSpacing",
	rowspan: "rowSpan"
};

/**
 * End of the start tag for empty elements
 */
JsDomSerializer.selfClosedEnd = ' />';

/**
 * Elements which are always empty
 */
JsDomSerializer.useEndTag = {
  script : 1,
  div : 1
};

/**
 * Escapes XML special chars
 */ 
JsDomSerializer.escapeXml = function(s, quotes) {
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  if (quotes) s = s.replace(/"/g, '&quot;');
  return s;
};

JsDomSerializer.prototype = {
  /**
   * Serializes a node delegating to specialized methods by nodeType
   */ 
  serialize:  function(node) {
    if (!this.isAllowed(node)) return '';
    switch(node.nodeType) {
    case 1: // element
      return this.serializeElement(node);
    case 2: // attribute
      return this.serializeAttribute(node);
    case 3: // text
      return this.serializeText(node);
    case 9: // document
      return this.serializeDocument(node);
    case 10: // doctype
      return this.serializeDoctype(node);
    }
    throw { name: 'NotImplementedError', message: 'Serialization of nodeType ' + node.nodeType + ' not implemented' };
    return '';
  },
  /**
   * Creates a start tag string
   */ 
  startTag : function(node) {
    return '<' + node.tagName.toLowerCase() + this.serializeAttributes(node.attributes) + (this.isEmpty(node) ? JsDomSerializer.selfClosedEnd : '>');
  },
  /**
   * Creates an end tag string
   */  
  endTag : function(node) {
    return this.isEmpty(node) ? '' : '</' + node.tagName.toLowerCase() + '>';
  },
  /**
   * Checks if a node element is empty
   */ 
  isEmpty : function(node) {
    return !node.childNodes.length && !JsDomSerializer.useEndTag[node.tagName.toLowerCase()];
  },
  /**
   * Iterates over childNodes returning its serialization
   */ 
  content : function(node) {
    var s = '', c = 0, el;
    while (el = node.childNodes[c++]) {
      s += this.serialize(el);
    }
    return s;
  },
  serializeDocument: function(doc) {
    return this.content(doc);
  },
  serializeElement: function(node) {
    return this.startTag(node) + this.content(node) + this.endTag(node);
  },
  serializeAttributes: function(attributes) {
    if (!attributes.length) return '';
    var pairs = [], attr, i;
    for (i = 0; i < attributes.length; i +=1) {
      attr = this.serialize(attributes[i]);
      if (attr) pairs.push(attr);
    }
    return pairs.length ? ' ' + pairs.join(' ') : '';
  },
  serializeDoctype: function(doctype) {
    // FIXME hardcoded "html" root element
    return '<!DOCTYPE html PUBLIC "' + doctype.publicId + '" "' + doctype.systemId + '">\n';
  },
  serializeAttribute: function(attr) {
    var name = JsDomSerializer.props[attr.nodeName] || attr.nodeName;
    var element = attr.ownerElement;
    var value;
    var special = /^(on.+|style|href|src|disabled)$/.test(attr.nodeName);
    if (!special && (name in element)) {
      value = element[name];
    }
    else {
      value = element.getAttribute(name, 2);
    }
    value = JsDomSerializer.escapeXml(value, true);
    return attr.nodeName + '="' + value + '"';
  },
  serializeText: function(node) {
    return JsDomSerializer.escapeXml(node.nodeValue);
  },
  /**
   * Runs the filter stack until any of the callbacks returns false
   */
  isAllowed: function(node) {
    for (var i = 0; i < this.filters.length; i += 1) {
      if (this.filters[i](node) === false) {
        return false;
      }
    }
    return true;
  },
  /**
   * Adds a filter to allow/disallow elements and attributes
   */ 
  addFilter: function(fn) {
    this.filters.push(fn);
    return this;
  }
};