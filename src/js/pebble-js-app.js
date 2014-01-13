//////////////////////////////////////////////////////////
////////// JSXML XML Tools                    ////////////
////////// Ver 1.3 Aug 29 2009                ////////////
////////// Copyright 2000-2009 Peter Tracey   ////////////
////////// http://levelthreesoltions.com/jsxml/
////
////	Objects:
////
////	REXML
////    Regular Expression-based XML parser
////
////	JSXMLIterator
////    Iterates through the tree structure without recursion
////
////	JSXMLBuilder
////    Loads xml into a linear structure and provides 
////	interface for adding and removing elements 
////	and setting attributes, generates XML
////
////	Utility functions:
////
////	ParseAttribute
////    Takes string of attibutes and attribute name
////    Returns attribute value
////
////	Array_Remove
////    Removes element in array
////
////	Array_Add
////    Adds element to array
////
////	RepeatChar
////    Repeats string specified number of times
////
///////////////////////////////////////////////////////////////


function REXML(XML) {
	this.XML = XML;

	this.rootElement = null;

	this.parse = REXML_parse;
	if (this.XML && this.XML != "") this.parse();
}

	function REXML_parse() {
		var reTag = new RegExp("<([^>/ ]*)([^>]*)>","g"); // matches that tag name $1 and attribute string $2
		var reTagText = new RegExp("<([^>/ ]*)([^>]*)>([^<]*)","g"); // matches tag name $1, attribute string $2, and text $3
		var strType = "";
		var strTag = "";
		var strText = "";
		var strAttributes = "";
		var strOpen = "";
		var strClose = "";
		var iElements = 0;
		var xmleLastElement = null;
		if (this.XML.length == 0) return;
		var arrElementsUnparsed = this.XML.match(reTag);
		var arrElementsUnparsedText = this.XML.match(reTagText);
		var i=0;
		if (arrElementsUnparsed[0].replace(reTag, "$1") == "?xml") i++;

		for (; i<arrElementsUnparsed.length; i++) {
			strTag = arrElementsUnparsed[i].replace(reTag,"$1");
			strAttributes = arrElementsUnparsed[i].replace(reTag,"$2");
			strText = arrElementsUnparsedText[i].replace(reTagText,"$3").replace(/[\r\n\t ]+/g, " "); // remove white space
			strClose = "";
			if (strTag.indexOf("![CDATA[") == 0) {
				strOpen = "<![CDATA[";
				strClose = "]]>";
				strType = "cdata";
			} else if (strTag.indexOf("!--") == 0) {
				strOpen = "<!--";
				strClose = "-->";
				strType = "comment";
			} else if (strTag.indexOf("?") == 0) {
				strOpen = "<?";
				strClose = "?>";
				strType = "pi";
			} else strType = "element";
			if (strClose != "") {
				strText = "";
				if (arrElementsUnparsedText[i].indexOf(strClose) > -1) strText = arrElementsUnparsedText[i];
				else {
					for (; i<arrElementsUnparsed.length && arrElementsUnparsedText[i].indexOf(strClose) == -1; i++) {
						strText += arrElementsUnparsedText[i];
					}
					strText += arrElementsUnparsedText[i];
				}
				if (strText.substring(strOpen.length, strText.indexOf(strClose)) != "")	{
					xmleLastElement.childElements[xmleLastElement.childElements.length] = new REXML_XMLElement(strType, "","",xmleLastElement,strText.substring(strOpen.length, strText.indexOf(strClose)));
					if (strType == "cdata") xmleLastElement.text += strText.substring(strOpen.length, strText.indexOf(strClose));
				}
				if (strText.indexOf(strClose)+ strClose.length < strText.length) {
					xmleLastElement.childElements[xmleLastElement.childElements.length] = new REXML_XMLElement("text", "","",xmleLastElement,strText.substring(strText.indexOf(strClose)+ strClose.length, strText.length));
					if (strType == "cdata") xmleLastElement.text += strText.substring(strText.indexOf(strClose)+ strClose.length, strText.length);
				}
				continue;
			}
			if (strText.replace(/ */, "") == "") strText = "";
			if (arrElementsUnparsed[i].substring(1,2) != "/") {
				if (iElements == 0) {
					xmleLastElement = this.rootElement = new REXML_XMLElement(strType, strTag,strAttributes,null,strText);
					iElements++;
					if (strText != "") xmleLastElement.childElements[xmleLastElement.childElements.length] = new REXML_XMLElement("text", "","",xmleLastElement,strText);
				} else if (arrElementsUnparsed[i].substring(arrElementsUnparsed[i].length-2,arrElementsUnparsed[i].length-1) != "/") {
					xmleLastElement = xmleLastElement.childElements[xmleLastElement.childElements.length] = new REXML_XMLElement(strType, strTag,strAttributes,xmleLastElement,"");
					iElements++;
					if (strText != "") {
						xmleLastElement.text += strText;
						xmleLastElement.childElements[xmleLastElement.childElements.length] = new REXML_XMLElement("text", "","",xmleLastElement,strText);
					}
				} else {
					xmleLastElement.childElements[xmleLastElement.childElements.length] = new REXML_XMLElement(strType, strTag,strAttributes,xmleLastElement,strText);
					if (strText != "") xmleLastElement.childElements[xmleLastElement.childElements.length] = new REXML_XMLElement("text", "","",xmleLastElement,strText);
				}
			} else {
				xmleLastElement = xmleLastElement.parentElement;
				iElements--;
				if (xmleLastElement && strText != "") {
					xmleLastElement.text += strText;
					xmleLastElement.childElements[xmleLastElement.childElements.length] = new REXML_XMLElement("text", "","",xmleLastElement,strText);
				}
			}
		}
	}

	function REXML_XMLElement(strType, strName, strAttributes, xmlParent, strText) {
		this.type = strType;
		this.name = strName;
		this.attributeString = strAttributes;
		this.attributes = null;
		this.childElements = new Array();
		this.parentElement = xmlParent;
		this.text = strText; // text of element

		this.getText = REXML_XMLElement_getText; // text of element and child elements
		this.childElement = REXML_XMLElement_childElement;
		this.attribute = REXML_XMLElement_attribute;
	}

		function REXML_XMLElement_getText() {
			if (this.type == "text" || this.type == "cdata") {
				return this.text;
			} else if (this.childElements.length) {
				var L = "";
				for (var i=0; i<this.childElements.length; i++) {
					L += this.childElements[i].getText();
				}
				return L;
			} else return "";
		}
		
		function REXML_XMLElement_childElement(strElementName) {
			for (var i=0; i<this.childElements.length; i++) if (this.childElements[i].name == strElementName) return this.childElements[i];
			return null;
		}

		function REXML_XMLElement_attribute(strAttributeName) {
			if (!this.attributes) {
				var reAttributes = new RegExp(" ([^= ]*)=","g"); // matches attributes
				if (this.attributeString.match(reAttributes) && this.attributeString.match(reAttributes).length) {
					var arrAttributes = this.attributeString.match(reAttributes);
					if (!arrAttributes.length) arrAttributes = null;
					else for (var j=0; j<arrAttributes.length; j++) {
						arrAttributes[j] = new Array(
							(arrAttributes[j]+"").replace(/[= ]/g,""),
							ParseAttribute(this.attributeString, (arrAttributes[j]+"").replace(/[= ]/g,""))
										);
					}
					this.attributes = arrAttributes;
				}
			}
			if (this.attributes) for (var i=0; i<this.attributes.length; i++) if (this.attributes[i][0] == strAttributeName) return this.attributes[i][1];
			return "";
		}


function JSXMLBuilder() {
	this.XML = "";
	this.elements = new Array();
	Array.prototype.remove = Array_Remove;
	Array.prototype.add = Array_Add;

	this.load = JSXMLBuilder_load;
	this.element = JSXMLBuilder_element;
	this.addElementAt = JSXMLBuilder_addElementAt;
	this.insertElementAt = JSXMLBuilder_insertElementAt;
	this.removeElement = JSXMLBuilder_removeElement;
	this.generateXML = JSXMLBuilder_generateXML;
	this.moveElement = JSXMLBuilder_moveElement;
}

	function JSXMLBuilder_load(strXML, xmleElem) {
		this.XML = strXML;

		if (!xmleElem) {
			if (strXML.length) xmleElem = (new REXML(strXML)).rootElement;
			else return false;
		}

		var xmlBuilder = new JSXMLIterator(xmleElem);

		while (true) {
			if (xmlBuilder.xmleElem.type == "element") {
				if (xmlBuilder.xmleElem.attributes) {
					this.addElementAt(xmlBuilder.xmleElem.name,xmlBuilder.xmleElem.attributes, xmlBuilder.xmleElem.text, this.elements.length, xmlBuilder.iElemLevel);
				} else {	
					this.addElementAt(xmlBuilder.xmleElem.name,xmlBuilder.xmleElem.attributeString, xmlBuilder.xmleElem.text, this.elements.length, xmlBuilder.iElemLevel);
				}
			}
			if (!xmlBuilder.getNextNode(false)) break;
		}
		for (var i=0; i<this.elements.length; i++) this.elements[i].index = i;
	}

	function JSXMLBuilder_element(iIndex) {
		return this.elements[iIndex];
	}

	function JSXMLBuilder_addElementAt(strElement,Attributes,strText,iElemIndex,iElemLevel) {
		iElemIndex = parseInt(iElemIndex);
		iElemLevel = parseInt(iElemLevel);
		if (iElemIndex < 0 || typeof(iElemIndex) != "number" || isNaN(iElemIndex)) iElemIndex = (this.elements.length>0) ? this.elements.length-1 : 0;
		if (iElemLevel < 0 || typeof(iElemLevel) != "number" || isNaN(iElemLevel)) iElemLevel = this.elements[iElemIndex-1].level;
		if (!Attributes) Attributes = "";
		var Elem = new Array();
		var iAddIndex = iElemIndex;
		if (iElemIndex > 0) {
			for (var i=iElemIndex; i<this.elements.length; i++) if (this.elements[i].level > iElemLevel) iAddIndex++;
			else if (this.elements[i].level <= this.elements[iElemIndex].level) break;
			Elem = new JSXMLBuilder_XMLElement(strElement,Attributes,strText,iElemLevel+1,this);
		} else {
			Elem = new JSXMLBuilder_XMLElement(strElement,Attributes,strText,1,this);
		}
		this.elements = this.elements.add(iAddIndex,Elem);
		for (var i=iAddIndex; i<this.elements.length; i++) this.elements[i].index = i;
	}

	function JSXMLBuilder_insertElementAt(strElement,Attributes,strText,iElemIndex,iElemLevel) {
		iElemIndex = parseInt(iElemIndex);
		iElemLevel = parseInt(iElemLevel);
		if (iElemIndex < 0 || typeof(iElemIndex) != "number" || isNaN(iElemIndex)) iElemIndex = (this.elements.length>0) ? this.elements.length-1 : 0;
		if (iElemLevel < 0 || typeof(iElemLevel) != "number" || isNaN(iElemLevel)) iElemLevel = this.elements[iElemIndex-1].level;
		if (!Attributes) Attributes = "";
		var Elem = null;
		var iAddIndex = iElemIndex;
		if (iElemIndex > 0 && iElemLevel > 0) {
			Elem = new JSXMLBuilder_XMLElement(strElement,Attributes,strText,iElemLevel+1,this);
		} else {
			Elem = new JSXMLBuilder_XMLElement(strElement,Attributes,strText,1,this);
		}
		this.elements = this.elements.add(iAddIndex,Elem);
		for (var i=iAddIndex; i<this.elements.length; i++) this.elements[i].index = i;
	}


	function JSXMLBuilder_removeElement(iElemIndex) {
		iElemIndex = parseInt(iElemIndex);
		for (var iAfterElem=iElemIndex+1; iAfterElem<this.elements.length; iAfterElem++) if (this.elements[iAfterElem].level < this.elements[iElemIndex].level+1) break;

		this.elements = this.elements.slice(0,iElemIndex).concat(this.elements.slice(iAfterElem,this.elements.length));
		for (var i=iElemIndex; i<this.elements.length; i++) this.elements[i].index = i;
	}

	function JSXMLBuilder_moveElement(iElem1Index,iElem2Index) {
		var arrElem1Elements = new Array(this.elements[iElem1Index]);
		var arrElem2Elements = new Array(this.elements[iElem2Index]);
		for (var i=iElem1Index; i<this.elements.length; i++) if (this.elements[i].level > this.elements[iElem1Index].level) arrElem1Elements[arrElem1Elements.length] = this.elements[i]; else if (i>iElem1Index) break;
		for (var i=iElem2Index; i<this.elements.length; i++) if (this.elements[i].level > this.elements[iElem2Index].level) arrElem2Elements[arrElem2Elements.length] = this.elements[i]; else if (i>iElem2Index) break;
		var arrMovedElements = new Array();
		if (iElem1Index < iElem2Index) {
			for (i=0; i<iElem1Index; i++) arrMovedElements[arrMovedElements.length] = this.elements[i]; // start to the 1st element
			for (i=iElem1Index+arrElem1Elements.length; i<iElem2Index+arrElem2Elements.length; i++) arrMovedElements[arrMovedElements.length] = this.elements[i]; // end of 1st element to end of 2nd element
			for (i=0; i<arrElem1Elements.length; i++) arrMovedElements[arrMovedElements.length] = arrElem1Elements[i]; // 1st element and all child elements
			for (i=iElem2Index+arrElem2Elements.length; i<this.elements.length; i++) arrMovedElements[arrMovedElements.length] = this.elements[i]; // end of 2nd element to end
			this.elements = arrMovedElements;
		} else {
			for (i=0; i<iElem2Index; i++) arrMovedElements[arrMovedElements.length] = this.elements[i]; // start to the 2nd element
			for (i=0; i<arrElem1Elements.length; i++) arrMovedElements[arrMovedElements.length] = arrElem1Elements[i]; // 1st element and all child elements
			for (i=iElem2Index; i<iElem1Index; i++) arrMovedElements[arrMovedElements.length] = this.elements[i]; // 2nd element to 1st element
			for (i=iElem1Index+arrElem1Elements.length; i<this.elements.length; i++) arrMovedElements[arrMovedElements.length] = this.elements[i]; // end of 1st element to end
			this.elements = arrMovedElements;
		}
		for (var i=0; i<this.elements.length; i++) this.elements[i].index = i;
	}


	function JSXMLBuilder_generateXML(bXMLTag) {
		var strXML = "";
		var arrXML = new Array();
		if (bXMLTag) strXML += '<?xml version="1.0"?>\n\n'
		for (var i=0; i<this.elements.length; i++) {
			strXML += RepeatChar("\t",this.elements[i].level-1);
			strXML += "<" + this.element(i).name // open tag
			if (this.element(i).attributes) {
				for (var j=0; j<this.element(i).attributes.length; j++) { // set attributes
					if (this.element(i).attributes[j]) {
						strXML += ' ' + this.element(i).attributes[j][0] + '="' + this.element(i).attributes[j][1] + '"';
					}
				}
			} else strXML += this.element(i).attributeString.replace(/[\/>]$/gi, "");
			if (((this.elements[i+1] && this.elements[i+1].level <= this.elements[i].level) || // next element is a lower or equal to
				(!this.elements[i+1] && this.elements[i-1])) // no next element, previous element
				&& this.element(i).text == "") {
				strXML += "/";
			}
			strXML += ">";
			if (this.element(i).text != "") strXML += this.element(i).text;
			else strXML += "\n";
			if (((this.elements[i+1] && this.elements[i+1].level <= this.elements[i].level) || // next element is a lower or equal to
				(!this.elements[i+1] && this.elements[i-1])) // no next element, previous element
				&& this.element(i).text != "") strXML += "</" + this.element(i).name + ">\n";
			if (!this.elements[i+1]) {
				lastelem = i;
				for (var j=i; j>-1; j--) {
					if (this.elements[j].level >= this.elements[i].level) continue;
					else {
						if (this.elements[j].level < this.elements[lastelem].level) {
							strXML += RepeatChar("\t",this.elements[j].level-1) + "</" + this.element(j).name + ">\n";
							lastelem = j;
						}
					}
				}
			} else {
				if (this.elements[i+1].level < this.elements[i].level) {
					lastelem = i;
					for (var j=i; this.elements[j].level>=this.elements[i+1].level; j--) {
						if (this.elements[i] && this.elements[j] && this.elements[j].level < this.elements[i].level && this.elements[j].level < this.elements[lastelem].level) {
							strXML += RepeatChar("\t",this.elements[j].level-1) + "</" + this.element(j).name + ">\n";
							lastelem = j;
						}
					}
				}
			}
			if (strXML.length > 1000) {
				arrXML[arrXML.length] = strXML;
				strXML = "";
			}
		}
		arrXML[arrXML.length] = strXML;
		return arrXML.join("");
	}

	function JSXMLBuilder_XMLElement(strName,Attributes,strText,iLevel,xmlBuilder) {
		this.type = "element";
		this.name = strName;
		this.attributes = (typeof(Attributes) != "string") ? Attributes : null;
		this.attributeString = (typeof(Attributes) == "string") ? Attributes : "";
		this.text = strText;
		this.level = iLevel;
		this.index = -1;
		this.xmlBuilder = xmlBuilder;

		this.parseAttributes = JSXMLBuilder_XMLElement_parseAttributes;
		this.attribute = JSXMLBuilder_XMLElement_attribute;
		this.setAttribute = JSXMLBuilder_XMLElement_setAttribute;
		this.removeAttribute = JSXMLBuilder_XMLElement_removeAttribute;
		this.parentElement = JSXMLBuilder_XMLElement_parentElement;
		this.childElement = JSXMLBuilder_XMLElement_childElement;
	}

		function JSXMLBuilder_XMLElement_parseAttributes() {
			if (!this.attributes) {
				var reAttributes = new RegExp(" ([^= ]*)=","g"); // matches attributes
				if (this.attributeString.match(reAttributes) && this.attributeString.match(reAttributes).length) {
					var arrAttributes = this.attributeString.match(reAttributes);
					if (!arrAttributes.length) arrAttributes = null;
					else for (var j=0; j<arrAttributes.length; j++) {
						arrAttributes[j] = new Array(
							(arrAttributes[j]+"").replace(/[= ]/g,""),
							ParseAttribute(this.attributeString, (arrAttributes[j]+"").replace(/[= ]/g,""))
										);
					}
					this.attributes = arrAttributes;
				}
			}
		}
	
		function JSXMLBuilder_XMLElement_attribute(AttributeName) {
			if (!this.attributes) this.parseAttributes();
			if (this.attributes) for (var i=0; i<this.attributes.length; i++) if (this.attributes[i][0] == AttributeName) return this.attributes[i][1];
			return "";
		}

		function JSXMLBuilder_XMLElement_setAttribute(AttributeName,Value) {
			if (!this.attributes) this.parseAttributes();
			if (this.attributes) for (var i=0; i<this.attributes.length; i++) if (this.attributes[i][0] == AttributeName) {
				this.attributes[i][1] = Value;
				return;
			}
			this.attributes[this.attributes.length] = new Array(AttributeName,Value);
		}

		function JSXMLBuilder_XMLElement_removeAttribute(AttributeName,Value) {
			if (!this.attributes) this.parseAttributes();
			if (this.attributes) for (var i=0; i<this.attributes.length; i++) if (this.attributes[i][0] == AttributeName) {
				this.attributes = this.attributes.remove(i);
				return;
			}
		}

		function JSXMLBuilder_XMLElement_parentElement() {
			for (var i=this.index; this.xmlBuilder.element(i) && this.xmlBuilder.element(i).level != this.level-1; i--);
			return this.xmlBuilder.element(i);
		}

		function JSXMLBuilder_XMLElement_childElement(Child) {
			var iFind = -1;
			for (var i=this.index+1; i<this.xmlBuilder.elements.length; i++) {
				if (this.xmlBuilder.elements[i].level == this.level+1) {
					iFind++;
					if (iFind == Child || this.xmlBuilder.elements[i].name == Child) return this.xmlBuilder.elements[i];
				} else if (this.xmlBuilder.elements[i].level <= this.level) break;
			}
			return null;
		}


function JSXMLIterator(xmleElem) {
	this.xmleElem = xmleElem;
	
	this.iElemIndex = 0;
	this.arrElemIndex = new Array(0);
	this.iElemLevel = 0;
	this.iElem = 0;
	this.arrElemIndex[this.iElemLevel] = -1;

	this.getNextNode = JSXMLIterator_getNextNode;
}

	function JSXMLIterator_getNextNode() {
		if (!this.xmleElem || this.iElemLevel<0)	return false;
		if (this.xmleElem.childElements.length) {  // move up
			this.arrElemIndex[this.iElemLevel]++;
			this.iElemIndex++;
			this.iElemLevel++;
			this.arrElemIndex[this.iElemLevel] = 0;
			this.xmleElem = this.xmleElem.childElements[0];
		} else { // move next
			this.iElemIndex++;
			this.arrElemIndex[this.iElemLevel]++;
			if (this.xmleElem.parentElement && this.xmleElem.parentElement.childElements.length && this.arrElemIndex[this.iElemLevel] < this.xmleElem.parentElement.childElements.length) this.xmleElem = this.xmleElem.parentElement.childElements[this.arrElemIndex[this.iElemLevel]];
			else {
				if (this.iElemLevel>0) { // move down
					for (; this.iElemLevel > 0; this.iElemLevel--) {
						if (this.xmleElem.parentElement && this.xmleElem.parentElement.childElements[this.arrElemIndex[this.iElemLevel]]) {
							this.xmleElem = this.xmleElem.parentElement.childElements[this.arrElemIndex[this.iElemLevel]];
							this.iElemLevel++;
							this.arrElemIndex = this.arrElemIndex.slice(0,this.iElemLevel+1);
							break;
						} else {
							this.xmleElem = this.xmleElem.parentElement;
						}
					}
					this.iElemLevel--;
				} else {
					return false;
				}
			}
		}
		return (typeof(this.xmleElem) == "object" && this.iElemLevel > -1);
	}

function ParseAttribute(str,Attribute) {
	var str = str +  ">";
	if (str.indexOf(Attribute + "='")>-1) var Attr = new RegExp(".*" + Attribute + "='([^']*)'.*>");
	else if (str.indexOf(Attribute + '="')>-1) var Attr = new RegExp(".*" + Attribute + '="([^"]*)".*>');
	return str.replace(Attr, "$1");
}

function Array_Remove(c) {
	var tmparr = new Array();
	for (var i=0; i<this.length; i++) if (i!=c) tmparr[tmparr.length] = this[i];
	return tmparr;
}

function Array_Add(c, cont) {
	if (c == this.length) {
		this[this.length] = cont;
		return this;
	}
	var tmparr = new Array();
	for (var i=0; i<this.length; i++) {
		if (i==c) tmparr[tmparr.length] = cont;
		tmparr[tmparr.length] = this[i];
	}
	if (!tmparr[c]) tmparr[c] = cont;
	return tmparr;
}

function RepeatChar(sChar,iNum) {
	var L = "";
	for (var i=0; i<iNum; i++) L += sChar;
	return L;
}



// Global variables that need to be customized to the environment.
var _sonosTopology = { "zones": [
    { "name": "kitchen", "ip": "192.168.0.4", "id": "RINCON_000E58543E0201400" },
    { "name": "living room", "ip": "192.168.0.10", "id": "RINCON_000E582B0AEE01400" },
    { "name": "family room", "ip": "192.168.0.15", "id": "RINCON_000E58F383A801400" }
]
};
var _providers = [{ "name": "Spotify", "keyword": "spotify" },
                  { "name": "Local", "keyword": "x-file-cifs" },
                  { "name": "Radio", "keyword": "aac" },
                  { "name": "Radio", "keyword": "mms" }];
var _webLocation = "http://www.lostvibe.com/ImageLoader.ashx?name=/";
var _bingAPIKey = "B6FDB3C1D3886880F74466641F6A909C739D9AAC"; // only required if you want to do image search

// Global variables that don't need to be customized to the environment.
var _soapRequestTemplate = '<?xml version="1.0" encoding="utf-8"?><s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>{0}</s:Body></s:Envelope>';
var _port = ':1400';
var _currentArtist = "";
var _currentComposer = "";
var _currentAlbum = "";
var _selectedZone = 0;  // zone serving up media
var _refreshRate = 15000; // milliseconds
var _debug = false;
var _autoSetToMaster = true;
var _masterFound = false;
var _playlistsRetrieved = false;
var _trackChange = true;
var _debugWindow = null;
var _clipboard = "";
var _debugConsole;
var RequestType = { "metadata": 0, "transport": 1, "playlists": 2, "oneplaylist": 3 };

// Some general functions for the page
//

// Logging functionality.
function log(message) {
   console.log(message);
}

//
// The following functions represent the functionality of making requests to the
// UPnP devices and dealing with the response.
//

// Function to mute or unmote the selected zone. Action: 0 (unmute), 1 (mute)
function muteOrUnMute(zone, mute) {
    var url, xml, soapBody, soapAction;
    var _activeZone = zone;
    var host = _sonosTopology.zones[_activeZone].ip + _port;
    url = '/MediaRenderer/RenderingControl/Control';
    soapAction = "urn:upnp-org:serviceId:RenderingControl#SetMute";
    soapBody = '<u:SetMute xmlns:u="urn:schemas-upnp-org:service:RenderingControl:1"><InstanceID>0</InstanceID><Channel>Master</Channel><DesiredMute>' + mute + '</DesiredMute></u:SetMute>';
    xml = _soapRequestTemplate.replace('{0}', soapBody);
    sendSoapRequest(url, host, xml, soapAction, RequestType.transport);
}

// Function to process Play, Stop, Pause, Previous and Next commands.
function transport(zone,cmd) {
    var url, xml, soapBody, soapAction;
    //var _activeZone = jQuery('#ZoneSelect')[0].selectedIndex;
    var host = _sonosTopology.zones[zone].ip + _port;
    url = '/MediaRenderer/AVTransport/Control';
    soapAction = "urn:schemas-upnp-org:service:AVTransport:1#" + cmd;
    soapBody = '<u:' + cmd + ' xmlns:u="urn:schemas-upnp-org:service:AVTransport:1"><InstanceID>0</InstanceID><Speed>1</Speed></u:' + cmd + '>';
    xml = _soapRequestTemplate.replace('{0}', soapBody);
    sendSoapRequest(url, host, xml, soapAction, RequestType.transport);
}

// Get playlists.
function getPlaylists(zone) {
    var url, xml, soapBody, soapAction;
    //var _zoneToPullFrom = jQuery('#ZoneSelect')[0].selectedIndex;
    var host = _sonosTopology.zones[zone].ip + _port;
    url = '/MediaServer/ContentDirectory/Control';
    soapAction = 'urn:schemas-upnp-org:service:ContentDirectory:1#Browse';
    soapBody = '<u:Browse xmlns:u="urn:schemas-upnp-org:service:ContentDirectory:1"><ObjectID>SQ:</ObjectID><BrowseFlag>BrowseDirectChildren</BrowseFlag><Filter></Filter><StartingIndex>0</StartingIndex><RequestedCount>100</RequestedCount><SortCriteria></SortCriteria></u:Browse>';
    xml = _soapRequestTemplate.replace('{0}', soapBody);
    sendSoapRequest(url, host, xml, soapAction, RequestType.playlists);
}
function getPlaylist(zone,value) {
    var url, xml, soapBody, soapAction;
    //var _zoneToPullFrom = jQuery('#ZoneSelect')[0].selectedIndex;
    var host = _sonosTopology.zones[zone].ip + _port;
    url = '/MediaServer/ContentDirectory/Control';
    soapAction = 'urn:schemas-upnp-org:service:ContentDirectory:1#Browse';
    soapBody = '<u:Browse xmlns:u="urn:schemas-upnp-org:service:ContentDirectory:1"><ObjectID>'+value+'</ObjectID><BrowseFlag>BrowseDirectChildren</BrowseFlag><Filter></Filter><StartingIndex>0</StartingIndex><RequestedCount>1000</RequestedCount><SortCriteria></SortCriteria></u:Browse>';
    xml = _soapRequestTemplate.replace('{0}', soapBody);
    sendSoapRequest(url, host, xml, soapAction, RequestType.oneplaylist);
}

// Refresh metadata.
function refreshCurrentlyPlaying(zone) {
    // Set some globals to default.
	console.log("refreshing zone " + zone)
    _currentAlbum = _currentArtist = _currentComposer = "";

    if (_trackChange) {
		//TODO:send app message
		/*
        jQuery.each(jQuery('div[id$=Metadata]'), function(i, item) {
            item.className = "ElementHidden";
        });
		*/
    }

    var url, xml, soapBody, soapAction;
    //var _zoneToPullFrom = jQuery('#ZoneSelect')[0].selectedIndex;
    var host = _sonosTopology.zones[zone].ip + _port;
    url = '/MediaRenderer/AVTransport/Control';
    soapAction = 'urn:schemas-upnp-org:service:AVTransport:1#GetPositionInfo';
    soapBody = '<u:GetPositionInfo xmlns:u="urn:schemas-upnp-org:service:AVTransport:1"><InstanceID>0</InstanceID><Channel>Master</Channel></u:GetPositionInfo>';
    xml = _soapRequestTemplate.replace('{0}', soapBody);
    sendSoapRequest(url, host, xml, soapAction, RequestType.metadata);
    if (!_playlistsRetrieved) {
		console.log("retrieving playlists for zone " + zone);
        getPlaylists(zone);
        _playlistsRetrieved = true;
    }
}

	
	
function soaphandler_metadata() {
  if(this.readyState == this.DONE) {
    if(this.status == 200 && this.responseText != null)
	{
		console.log("\n Got 200 response for metadata:" + this.responseText);
		console.log("\n metadata XML:" + this.responseXML);
		processSuccessfulAjaxRequestNodes_Metadata(this.responseText, '');
      return;
    }
	  // something went wrong
	console.log("\n Error in SOAP metadata handler: status = " + this.status + ", readyState = " + this.readyState + ", xml = " + this.responseText);
  }
    
}
	
	function soaphandler_playlists() {
  if(this.readyState == this.DONE) {
    if(this.status == 200 && this.responseText != null)
	{
		console.log("\n Got 200 response for playlists:" + this.responseText);
		console.log("\n playlists XML:" + this.responseXML);
		processSuccessfulAjaxRequestNodes_Metadata(this.responseText, '');
      return;
    }
	  // something went wrong
	console.log("\n Error in SOAP playlists handler: status = " + this.status + ", readyState = " + this.readyState + ", xml = " + this.responseText);
  }
    
}
	
// Main Ajax request function. uPnP requests go through here.
// Here we use jQuery Ajax method because it does cross-domain without hassle.
function sendSoapRequest(url, host, xml, soapAction, requestType) {
    url = 'http://' + host + url;

	console.log("\n Sending " + xml + "\n to " + url);
	var client = new XMLHttpRequest();
	if (requestType == RequestType.metadata)
	{ client.onreadystatechange = soaphandler_metadata; }
	if (requestType == RequestType.playlists)
	{ client.onreadystatechange = soaphandler_playlists; }
	client.open("POST", url);
	client.overrideMimeType("text/xml");
	client.setRequestHeader("SOAPAction", soapAction);
	client.send(xml);	
	
		/*
    Zepto.ajax({
        url: url,
        type: "POST",
        async: true,
        beforeSend: function (xhr) {
            xhr.setRequestHeader("SOAPAction", soapAction);
        },
        data: xml,
        success: function (data, status, xhr) {
            if (requestType == RequestType.metadata) {
                processSuccessfulAjaxRequestNodes_Metadata(Zepto(data).find("*"), host);
            }
            else if (requestType == RequestType.playlists) {
                processSuccessfulAjaxRequestNodes_Playlist(Zepto(data).find("*"), host);
            }
            else if (requestType == RequestType.oneplaylist) {
                processSuccessfulAjaxRequestNodes_OnePlaylist(Zepto(data).find("*"), host);
            }
            else if (requestType == RequestType.transport) {
                // If this isn't a metadata request, then we should refresh the metadata to sync UI.
                refreshCurrentlyPlaying();
            }
            var response = transport.responseText ||   "no response text";
            log("Success! \n\n" + data.xml);
        },
        complete: function (xhr, status) {
            var response = status || "no response text";
            log("Complete \n\n" + response);
        },
        ajaxError: function (data) {
            var response = data ||  "no response text";
            log("Failure! \n\n" + response);
        },
        error: function (xhr, status, err) { log('Exception: ' + err.message); }
		
    });
	*/
}

function processSuccessfulAjaxRequestNodes_OnePlaylist(responseNodes, host) {
   /* if (responseNodes[0].nodeName == "s:Envelope") {
        jQuery('#PlaylistDump').html("");
        var sb = "";
        _clipboard = "";
        var responseNodes2 = jQuery(responseNodes[0].text).find("item");
        for (var i = 0; i < responseNodes2.length; i++) {
            var track = "UNK" , album = "UNK", creator = "UNK";
            if (responseNodes2[i].getElementsByTagName("title")[0] !== undefined) {
                track = responseNodes2[i].getElementsByTagName("title")[0].innerText;
            }
            if (responseNodes2[i].getElementsByTagName("creator")[0] !== undefined) {
                artist = responseNodes2[i].getElementsByTagName("creator")[0].innerText;
            }
            if (responseNodes2[i].getElementsByTagName("album")[0] !== undefined) {
                album = responseNodes2[i].getElementsByTagName("album")[0].innerText;
            }
            if (track !== "UNK" || artist !== "UNK" || album !== "UNK") {
                sb += "\"" + track + "\" from <i>" + album + "</i> by " + artist + "<br ></br> ";
                _clipboard += track + "  from " + album + "  by " + artist + "\n";
            }
        }
        jQuery('#PlaylistDump').html(sb.toString());
     }*/
	
}

function CopyToClipboard() {
    if (window.clipboardData && clipboardData.setData) {
        clipboardData.setData("Text",_clipboard); // IE
    }
    // Add more clauses to deal with other browsers
    // e.g. http://www.dynamic-tools.net/toolbox/copyToClipboard/
}

function processSuccessfulAjaxRequestNodes_Playlist(responseNodes, host) {
    /*if (responseNodes[0].nodeName == "s:Envelope") {
        var responseNodes2 = jQuery(responseNodes[0].text).find("container");
        jQuery("select[id$=PlaylistSelect] > option").remove();
        for (var i = 0; i < responseNodes2.length; i++) {
            var playlistName = responseNodes2[i].firstChild.innerText;
            var playlistId = responseNodes2[i].getAttribute("id");
            addOption(jQuery('#PlaylistSelect')[0], playlistName, playlistId);
        }
    }
    else {
        jQuery("select[id$=PlaylistSelect] > option").remove();
        addOption(jQuery('#PlaylistSelect')[0], "Cannot get playlists.", 0);
    }
	*/
}
function processSuccessfulAjaxRequestNodes_Metadata(responseText, host) {
	console.log("processSuccessfulAjaxRequestNodes_Metadata 1");
	var xmlDoc = new REXML(responseText);
	console.log("The root element " + xmlDoc.rootElement.name + " has " + xmlDoc.rootElement.childElements.length + " child elements.");
	var responseNodes = xmlDoc.rootElement.childElements;
	
	var xmliterator = new JSXMLIterator(xmlDoc.rootElement);
	while (xmliterator.getNextNode())
	{
    //for (var i = 0; i < responseNodes.length; i++) {
	var currNode = xmliterator.xmleElem;	
        var currNodeName = currNode.name;
		console.log("nodename = " + currNodeName);
        if (currNodeName == "TrackURI") {
            var result = currNode.firstChild.nodeValue;
            if (result.indexOf("x-rincon") > -1) {
                var master = result.split(":")[1];
                var indx = _selectedZone;
				
				for (var k = 0; k < _sonosTopology.zones.length; k++)
				{
					if (_sonosTopology.zones[k].id == master) {
						indx = k;
					}
				}
				
                if (!_autoSetToMaster) {
                    console.log("slaved to " + _sonosTopology.zones[indx].name);
					/*Zepto('#coordinatorName')[0].innerHTML = "slaved to " + _sonosTopology.zones[indx].name;
                    Zepto('#CoordinatorMetadata')[0].className = "ElementVisible";*/
                }
                else {
                    /*jQuery('#ZoneSelect')[0].selectedIndex = indx;*/
                    refreshCurrentlyPlaying();
                }
            }
            else {
                _masterFound = true;
            }
        }
        if (currNodeName == "TrackMetaData") {
			console.log(currNode.text); //TODO: FIX!
			var innerMetadataXML = new REXML(currNode.text);
			
            var responseNodes2 = innerMetadataXML.rootElement.childElements;
            var isStreaming = false;
            for (var j = 0; j < responseNodes2.length; j++) {
                switch (responseNodes2[j].name) {
                    case "creator":
                        _currentComposer = XMLEscape.unescape(responseNodes2[j].firstChild.nodeValue);
                        /*if (_currentComposer !== jQuery('#composerName')[0].innerHTML) {
                            jQuery('#composerName')[0].innerHTML = _currentComposer;
                        }
                        jQuery('#ComposerMetadata')[0].className = "ElementVisible";*/
						console.log("Current Composer:" + _currentComposer);
                        break;
                    case "albumArtist":
                        _currentArtist = XMLEscape.unescape(responseNodes2[j].firstChild.nodeValue);
                        /*if (_currentArtist !== jQuery('#artistName')[0].innerHTML) {
                            jQuery('#artistName')[0].innerHTML = _currentArtist;
                        }
                        jQuery('#ArtistMetadata')[0].className = "ElementVisible";
						*/
						console.log("Current Artist:" + _currentArtist);
                        break;
                    case "title":
                        if (!isStreaming) {
							
                            _currentTrack = XMLEscape.unescape(responseNodes2[j].firstChild.nodeValue);
                            if (_currentTrack !== _lastTrack)
							{
								_trackChange = true;
								_lastTrack = _currentTrack;
							}
							else {
								_trackChange = false;
							}
							/*if (_currentTrack !== jQuery('#trackName')[0].innerHTML) {
                                jQuery('#trackName')[0].innerHTML = XMLEscape.unescape(responseNodes2[j].firstChild.nodeValue);
                                _trackChange = true;
                            }
                            else {
                                _trackChange = false;
                            }
                            jQuery('#TrackMetadata')[0].className = "ElementVisible";*/
							console.log("Current Track:" + _currentTrack);
                        }
                        break;

                    case "streamContent":
                        if (responseNodes2[j].attributes.getNamedItem('protocolInfo') !== null) {
                            _currentTrack = responseNodes2[j].attributes.getNamedItem('protocolInfo').value;
                            if (_currentTrack.length > 1) {
							if (_currentTrack !== _lastTrack)
							{
								_trackChange = true;
								_lastTrack = _currentTrack;
							}
							else {
								_trackChange = false;
							}
								/*
                                if (_currentTrack !== jQuery('#trackName')[0].innerHTML) {
                                    jQuery('#trackName')[0].innerHTML = XMLEscape.unescape(responseNodes2[j].firstChild.nodeValue);
                                    _trackChange = true;
                                }
                                else {
                                    _trackChange = false;
                                }
                                jQuery('#TrackMetadata')[0].className = "ElementVisible";
								*/
                                isStreaming = true;
                            }
							console.log("Current Track:" + _currentTrack);
                        }
                        break;

                    case "album":
                        _currentAlbum = XMLEscape.unescape(responseNodes2[j].firstChild.nodeValue);
						/*
                        if (_currentAlbum !== jQuery('#albumName')[0].innerHTML) {
                            jQuery('#albumName')[0].innerHTML = _currentAlbum;
                            jQuery('#albumArt')[0].alt = _currentAlbum;
                        }
                        jQuery('#AlbumMetadata')[0].className = "ElementVisible";
						*/
						console.log("Current Album:" + _currentAlbum);
                        break;
                    case "res":
                        var protocolInfo = responseNodes2[j].attributes.getNamedItem('protocolInfo').value;
                        if (protocolInfo !== undefined) {
                            for (var k = 0; k < _providers.length; k++) {
                                if (protocolInfo.toLowerCase().indexOf(_providers[k].keyword) > -1) {
                                    /*jQuery('#sourceName')[0].innerHTML = _providers[k].name;
                                    jQuery('#SourceMetadata')[0].className = "ElementVisible";*/
									console.log("Provider:" +  _providers[k].name);
                                }
                            }
                        }
                        break;
                    case "albumArtURI":
						/*
                        var newPath = XMLEscape.unescape(responseNodes2[j].firstChild.nodeValue);
                        newPath = (newPath.indexOf("http:") > -1) ? newPath : "http://" + host + newPath;
                        var currPath = jQuery('#albumArt')[0].src;
                        if (newPath !== currPath) {
                            jQuery('#albumArt')[0].src = newPath;
                        }
						*/
						console.log("ignoring album art callback");
                        break;

                }
            }
        }
    }
}

function getPlaylistDump() {
    //var selectedPlaylist = jQuery('#PlaylistSelect')[0].value;
    //getPlaylist(selectedPlaylist);
}
//
// The following functions deal with processing of additional album artwork images.
//

// A general image search - via Bing (requires an API key).
function doGeneralImageSearch() {

}

// Deals with button click request to check if there are additional album artwork images from Lostvibe.
function getLostvibeAssets() {

}

//
// Utility
//

var XMLEscape = {
    escape: function(string) {
        return this.xmlEscape(string);
    },
    unescape: function(string) {
        return this.xmlUnescape(string);
    },
    xmlEscape: function(string) {
        string = string.replace(/&/g, "&amp;");
        string = string.replace(/"/g, "&quot;");
        string = string.replace(/'/g, "&apos;");
        string = string.replace(/</g, "&lt;");
        string = string.replace(/>/g, "&gt;");
        return string;
    },
    xmlUnescape: function(string) {
        string = string.replace(/&amp;/g, "&");
        string = string.replace(/&quot;/g, "\"");
        string = string.replace(/&apos;/g, "'");
        string = string.replace(/&lt;/g, "<");
        string = string.replace(/&gt;/g, ">");
        return string;
    }
};




Pebble.addEventListener("ready",
                        function(e) {
                          console.log("in ready event! ready = " + e.ready);
                          console.log("e.type = " + e.type);
							refreshCurrentlyPlaying(1);
							
                        });

Pebble.addEventListener("appmessage",
                        function(e) {
						  console.log("appmessage handler...");
						  console.log("e.type = " + e.type);
                          console.log("e.payload.temperature = " + e.payload.temperature);
							//refreshCurrentlyPlaying(1);
                        });


Pebble.addEventListener("webviewclosed",
                                     function(e) {
                                     console.log("webview closed");
                                     console.log(e.type);
                                     console.log(e.response);
                                     });

