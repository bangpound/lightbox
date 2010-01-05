/*globals document,window,$,jQuery */
/*jslint white: true, onevar: true, undef: true, eqeqeq: true, plusplus: true, bitwise: true, regexp: true, strict: true, newcap: true, immed: true, indent: 2 */

"use strict";

/*
 * jQuery UI Lightbox
 *
 * Copyright (c) 2009 Benjamin Doherty
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * Depends:
 *  ui.core.js
 *  effects.core.js
 *  effects.drop.js
 *  jquery.mousewheel.js (optional)
 */
(function ($) {

  $.widget('ui.lightbox', {
    _init: function () {
      var self = this;
      // consider event delegation to make this more dynamic
      $(this.options.selector, this.element).click(function (event) {
        event.preventDefault();
        if (self.overlayElement || self.viewerElement) {
          return;
        }
        self._display(self._content(this));
        return false;
      });
      $(document).click(function (event) {
        // ignore right click
        if (event.button !== 2) {
          self.close();
        }
      }).keydown(function (event) {
        if (!self.currentAnchor) {
          return;
        }
        switch (event.keyCode) {
        case $.ui.keyCode.ESCAPE:
          self.close();
          break;
        case $.ui.keyCode.LEFT:
          self.prev("left");
          event.preventDefault();
          break;
        case $.ui.keyCode.UP:
          self.prev("up");
          event.preventDefault();
          break;
        case $.ui.keyCode.RIGHT:
          self.next("right");
          event.preventDefault();
          break;
        case $.ui.keyCode.DOWN:
          self.next("down");
          event.preventDefault();
          break;
        }
      });
      $(window).resize(function () {
        if (!self.currentAnchor) {
          return;
        }
      });
      if ($.fn.mousewheel) {
        $(document).mousewheel(function (event, delta) {
          if (!self.currentAnchor) {
            return;
          }
          event.preventDefault();
          if (self.viewerElement.is(":animated")) {
            return;
          }
          if (delta < 0) {
            self.next("down");
          }
          if (delta > 0) {
            self.prev("up");
          }
        });
      }
    },

    _showLoadingIndicator: function () {
      var self = this;
      this.loadingIndicatorTimeout = window.setTimeout(function () {
        if (!self.loadingIndicator) {
          self.loadingIndicator = self._element("div", "ui-loading-indicator ui-corner-all").appendTo(document.body);
        }
        self._position(self.loadingIndicator);
        self.loadingIndicator.fadeIn("slow");
      }, 250);
    },

    _hideLoadingIndicator: function () {
      window.clearTimeout(this.loadingIndicatorTimeout);
      if (this.loadingIndicator) {
        this.loadingIndicator.hide();
      }
    },

    close: function () {
      if (!this.currentAnchor) {
        return;
      }
      var self = this,
        anchor = this.currentAnchor,
        viewer = this._viewer();

      this.currentAnchor = null;
      this.viewerElement = null;
      this.overlayElement = null;
    },

    next: function (direction) {
      this._rotate(":gt(", ":first", direction || "up");
    },

    prev: function (direction) {
      this._rotate(":lt(", ":last", direction || "down");
    },

    _anchors: function () {
      // if deemed necessary, cache selection here
      return this.element.find(this.options.selector);
    },

    _display: function (content, direction) {
      if (!content) {
        return;
      }

      var self = this,
        visible = this.viewerElement && this.viewerElement.is(":visible"),
        viewer = this._viewer();

      if (direction) {
        this.options.rotateOut.call(viewer.parents('.ui-dialog')[0], direction, function () {
          viewer.empty();
        });
      }

      content.appendTo(viewer);

      if (!visible) {
        viewer.dialog('open');
      }
      else {
        this.options.rotateIn.call($(viewer).parents('.ui-dialog')[0], {
          up: "down",
          down: "up",
          left: "right",
          right: "left"
        }[direction]);
      }
    },

    _content: function (anchor) {
      if (!anchor) {
        anchor = this.currentAnchor;
      }

      var self = this,
        content = 'nothing',
        type = this.options.type ? this.options.type : this._deriveType(anchor),
        cache = {};

      this.currentAnchor = anchor;

      if (!cache[anchor]) {
        this._showLoadingIndicator();

        switch (type) {
        case "image":
          content = $('<img/>').load(function (event) {
            self._resize(content);
            self._position();
          }).attr("src", anchor.href);
          break;
        case "flash":
        case "flashvideo":
        case "quicktime":
        case "realplayer":
        case "windowsmedia":
          content = $("<div/>").media({
            width: this.options.width,
            height: this.options.height,
            src: anchor.href,
            autoplay: 1
          });
          break;
        case "iframe":
          content = $('<iframe/>').attr('src', anchor.href).attr('frameborder', 0).attr('border', 0);
          break;
        case "html":
        case "dom":
          var reference = $(anchor.href),
            id = "",
            counter = 0,
            marker = $("<div></div>").attr({
              "class": (reference.is(":hidden") ? "hidden" : ""),
              style  : "display: none"
            });

            if (!anchor.is("[id]")) {
              do {
                id = "element_" + counter++;
              } while ($("#" + id).length);
              anchor.attr('id', id);
            }

            marker.attr('id', "_" + anchor.attr('id') + "_marker");

            content = $("<div></div>").append(reference.before(marker).addClass("marked"));
            reference.show();
          break;
        case "ajax":
        case "script":
          $.ajax({
            url: anchor.href,
            type: (parseInt(this.options.post, 10) === 1) ? "POST" : "GET",
            cache: false,
            async: false,
            //data: options.parameters,
            dataType: (this.options.type === "ajax") ? "html" : "script",
            success: function (data, textStatus) {
              content = $(data);
              self._contentReady(content);
            }
          });
        }

        if ($.inArray(this.options.type, ["html", "dom", "iframe"]) !== -1) {
          self._contentReady(content);
        }
        this._hideLoadingIndicator();
      }

      cache[anchor] = content;

      return cache[anchor];
    },
    _deriveType: function (anchor) {
      var reference = anchor.href;
      if (reference.toLowerCase().match(/\.(gif|jpg|jpeg|png)(\?[0123456789]+)?$/)) {
        return "image";
      }
      if (reference.toLowerCase().match(/\.(swf)(\?[0123456789]+)?$/)) {
        return "flash";
      }
      if (reference.toLowerCase().match(/\.(flv)(\?[0123456789]+)?$/)) {
        return "flashvideo";
      }
      if (reference.toLowerCase().match(/\.(aif|aiff|aac|au|bmp|gsm|mov|mid|midi|mpg|mpeg|m4a|m4v|mp4|psd|qt|qtif|qif|qti|snd|tif|tiff|wav|3g2|3gp|wbmp)(\?[0123456789]+)?$/)) {
        return "quicktime";
      }
      if (reference.toLowerCase().match(/\.(ra|ram|rm|rpm|rv|smi|smil)(\?[0123456789]+)?$/)) {
        return "realplayer";
      }
      if (reference.toLowerCase().match(/\.(asf|avi|wma|wmv)(\?[0123456789]+)?$/)) {
        return "windowsmedia";
      }
      return "ajax";
    },
    _preloadNeighbours: function () {
      var anchors = this._anchors(),
        index = anchors.index(this.currentAnchor);
      anchors.filter(this._neighbours(anchors.length, index)).each(function () {
        //new Image().src = this.href;
      });
    },

    _neighbours: function (index, length) {
      return ":eq(" + (index === 0 ? length - 1 : index - 1) + "), :eq(" + (index === length - 1 ? 0 : index + 1) + ")";
    },

    _position: function (img) {
      this._viewer().dialog('option', 'position', 'center');
    },

    _resize: function (elem) {
      elem.css("width", "").css("height", "");
      var outerWidth = elem.width(),
        outerHeight = elem.height(),
        ratio = Math.min(
          Math.min(
            Math.min($(window).width(), outerWidth) / outerWidth,
            Math.min($(window).height() - 36, outerHeight) / outerHeight), 1),
        size = (this.size = {});

      $.extend(size, {
        width: Math.round(ratio * outerWidth),
        height: Math.round(ratio * outerHeight)
        //maxWidth: outerWidth,
        //maxHeight: outerHeight
      });
      elem.css('width', size.width);
      elem.css('height', size.height);
      this._viewer().css('width', size.width).dialog('option', 'width', size.width);
      this._viewer().css('height', size.height).dialog('option', 'height', size.height);
    },

    _rotate: function (selectorA, selectorB, direction) {
      if (!this.currentAnchor) {
        return;
      }
      var anchors = this._anchors();
      var target = anchors.filter(selectorA + anchors.index(this.currentAnchor) + ")" + selectorB)[0];
      if (!target && this.options.loop && anchors.length > 1) {
        target = anchors.filter(selectorB)[0];
      }
      this._display(this._content(target), direction);
    },

    _viewer: function (create) {
      if (create || !this.viewerElement) {
        var self = this;
        this.viewerElement = $('<div/>')
          .appendTo(document.body)
          .dialog({
            autoOpen: false,
            draggable: false,
            resizable: false,
            modal: true,
            open: function (event, ui) {
              $('.ui-dialog-buttonpane button', $(this).parents('.ui-dialog')).each(function (index, domElement) {
                $(domElement).addClass('button-' + index);
              });
              self._hideLoadingIndicator();
            },
            close: function (event, ui) {
            }
          });
      }
      return this.viewerElement;
    },

    _element: function (type, clazz) {
      return $("<" + type + "/>").addClass(clazz).hide();
    }

  });

  $.extend($.ui.lightbox, {
    defaults: {
      loop: true,
      overlay: true,
      selector: "a[href]:has(img[src])",
      titleSuffix: " - Click anywhere to close (or press Escape), use keyboard arrows or mousewheel to rotate images",
      rotateIn: function (direction) {
        $(this).effect("drop", {
          direction: direction,
          mode: "show"
        });
      },
      rotateOut: function (direction, finished) {
        $(this).effect("drop", {
          direction: direction
        }, "normal", finished);
      },
      show: function (anchor, dialog) {
        var thumb = $(anchor),
          lightbox = $(dialog),
          offset = thumb.offset();
        // TODO refactor
        var start = {
          left: offset.left,
          top: offset.top,
          width: thumb.width(),
          height: thumb.height(),
          opacity: 0
        }
        var stop = {
          left: lightbox.css("left"),
          top: lightbox.css("top"),
          width: lightbox.width(),
          height: lightbox.height(),
          opacity: 1
        }
        lightbox.data('dialog').uiDialog.css(start).show().animate(stop);
      },
      hide: function (anchor, finished) {
        var thumb = $(anchor),
          offset = thumb.offset();
        // TODO refactor (see above)
        var stop = {
          left: offset.left,
          top: offset.top,
          width: thumb.width(),
          height: thumb.height(),
          opacity: 0
        }
        $(this).animate(stop, finished);
      }
    }
  });

})(jQuery);
