var JsDomSerializer = function () {
  this.filters = [];
  this.translations = {};
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
 * Exportable attrs
 */  
JsDomSerializer.attrs = [
  'class',
  'for',
  'id',
  'type',
  'value',
  'disabled',
  'lang',
  'src',
  'name',
  'xmlns',
  'xml:lang',
  'content',
  'http-equiv',
  'href'
];

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
    // attributes are not handled through serialize 
    // case 2: // attribute
    //   return this.serializeAttribute(node, arguments[1]); // transmit the owner for IE
    case 3: // text
      return this.serializeText(node);
    case 8: // comments
      return this.serializeComment(node);
    case 9: // document
      return this.serializeDocument(node);
    case 10: // doctype
      return this.serializeDoctype(node);
    }
    if (JsDomSerializer.DEBUG) {
      throw { name: 'NotImplementedError', message: 'Serialization of nodeType ' + node.nodeType + ' not implemented' };
    }
    return '';
  },
  /**
   * Creates a start tag string
   */ 
  startTag : function(node, name, autoclosed) {
    return '<' + name + this.serializeAttributes(node) + (autoclosed && !JsDomSerializer.useEndTag[name] ? JsDomSerializer.selfClosedEnd : '>');
  },
  /**
   * Creates an end tag string
   */  
  endTag : function(node, name, hasContent) {
    return (hasContent || JsDomSerializer.useEndTag[name]) ? '</' + name + '>' : '';
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
    // translate name
    var temp = node.tagName.toLowerCase();
    var name = (temp in this.translations) ? this.translations[temp] : temp;
    var s = '';
    if (name === false) return '';
    var content = this.content(node);
    if (name) s += this.startTag(node, name, !content);
    s += content;
    if (name) s += this.endTag(node, name, !!content); 
    return s;
  },
  serializeAttributes: function(node) {
    var pairs = [], attributes = JsDomSerializer.attrs, attr, i;
    for (i = 0; i < attributes.length; i +=1) {
      if (!this.isAllowed(node, attributes[i])) continue;
      attr = this.serializeAttribute(node, attributes[i]);
      if (attr) pairs.push(attr);
    }
    return pairs.length ? ' ' + pairs.join(' ') : '';
  },
  serializeDoctype: function(doctype) {
    // FIXME hardcoded "html" root element
    return '<!DOCTYPE html PUBLIC "' + doctype.publicId + '" "' + doctype.systemId + '">\n';
  },
  serializeAttribute: function(node, name) {
    var search = JsDomSerializer.props[name] || name;
    var value;
    var special = /^(on.+|style|href|src)$/.test(name);
    if (!special && (search in node)) {
      value = node[search];
    }
    else {
      value = node.getAttribute(name, 2);
    }
    if (!value) return '';
    if (value === true) value = name; // disabled et al.
    value = JsDomSerializer.escapeXml(value, true);
    return name + '="' + value + '"';
  },
  serializeText: function(node) {
    return JsDomSerializer.escapeXml(node.nodeValue);
  },
  // comments are not serialized, extend if needed
  serializeComment : function(node) {
    return '';
  },
  /**
   * Runs the filter stack until any of the callbacks returns false
   */
  isAllowed: function(node, name) { // name is passed for attributes
    for (var i = 0; i < this.filters.length; i += 1) {
      if (this.filters[i](node, name) === false) {
        return false;
      }
    }
    return true;
  },
  /**
   * Sets an element name translation, use an empty string as translation
   * if you want to serialize the element contents without including
   * element tags.
   */ 
  translation: function(original, translation) {
    this.translations[original] = translation;
    return this;
  },
  /**
   * Adds a filter to allow/disallow elements and attributes
   */ 
  addFilter: function(fn) {
    this.filters.push(fn);
    return this;
  }
};