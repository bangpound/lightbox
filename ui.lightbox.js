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
 *  ui.dialog.js
 *  jquery.mousewheel.js (optional)
 */
(function ($) {

  $.widget('ui.lightbox', {
    _init: function () {
      var self = this,
        lightbox = (this.lightbox = $('<div/>')
          .dialog({
            autoOpen: false,
            modal: this.options.overlay,
            dialogClass: this.options.dialogClass,
            position: this.options.position,
            resizable: this.options.resizable,
            draggable: this.options.draggable,
            height: this.options.height,
            width: this.options.width,
            open: function (event, ui) {
              var type = self._deriveType(self.getCurrentAnchor());

              $('.ui-dialog-buttonpane button', $(this).parents('.ui-dialog'))
                .each(function (index, domElement) {
                  $(domElement).addClass('button-' + index);
                });
              self._hideLoadingIndicator();
            },
            resize: function (event, ui) {
              var type = self._deriveType(self.getCurrentAnchor());

              if (type == 'image') {
                self._resize();
                $(this).dialog('option', 'position', self.options.position);
              }
            },
            close: function (event, ui) {
            }
          }));

      // consider event delegation to make this more dynamic
      $(this.options.selector, this.element).click(function (event) {
        self._showLoadingIndicator();

        var content = self._loadContent(this);

        event.preventDefault();
        self.setCurrentAnchor(this);
        self.setContent(content);
        self._display();
        return false;
      });
      $(document).click(function (event) {
        // ignore right click
        if (event.button !== 2) {
          self.close();
        }
      }).keydown(function (event) {
        if (!self.getCurrentAnchor()) {
          return;
        }
        self._showLoadingIndicator();
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
        if (!self.getCurrentAnchor()) {
          return;
        }
        var type = self._deriveType(self.getCurrentAnchor());

        if (type == 'image') {
          self._resize();
        }
        self.lightbox.dialog('option', 'position', self.options.position);
      });
      if ($.fn.mousewheel) {
        $(document).mousewheel(function (event, delta) {
          if (!self.getCurrentAnchor()) {
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
      if (!this.getCurrentAnchor()) {
        return;
      }
      var self = this,
        anchor = this.getCurrentAnchor(),
        viewer = this.lightbox;

      // TODO: these need to be destroyed with the widget.
      // this.currentAnchor = null;
      // this.viewerElement = null;
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

    _display: function (direction) {
      if (!this.getContent()) {
        return;
      }

      var self = this,
        visible = this.lightbox.dialog('isOpen'),
        anchor = this.getCurrentAnchor(),
        type = this._deriveType(this.getCurrentAnchor()),
        content = this.getContent().show(),
        viewer = this.lightbox;

      viewer.empty().append(content);
      viewer.dialog('option', 'title', $(anchor).attr('title') + this.options.titleSuffix);

      if (visible) {
      }
      else {
        viewer.dialog('open');
      }
    },

    _loadContent: function (anchor) {
      var self = this,
        content = 'BUG',
        type = this.options.type ? this.options.type : this._deriveType(anchor);

      switch (type) {
      case "image":
        content = this._element('img')
          .attr("src", anchor.href)
          .load(function (event) {
            self._resize();
            self.lightbox.dialog('option', 'position', self.options.position);
          });
        break;
      case "flash":
      case "flashvideo":
      case "quicktime":
      case "realplayer":
      case "windowsmedia":
        $(anchor).media({
          width: this.options.width,
          height: this.options.height,
          src: anchor.href,
          autoplay: 1
        }, function (element, options) {
        }, function (element, data, options, playerName) {
          content = $(data).clone();
          $(data).media('undo');
        });
        break;
      case "iframe":
        content = this._element('iframe').attr('src', anchor.href).attr('frameborder', 0).attr('border', 0);
        break;
      case "html":
      case "dom":
        var reference = $($(anchor).attr('href'));

        content = $(reference).clone();
        break;
      case "ajax":
      case "script":
        $.ajax({
          url: anchor.href,
          type: (parseInt(this.options.post, 10) === 1) ? "POST" : "GET",
          cache: false,
          async: false,
          data: this.options.parameters,
          dataType: (this.options.type === "ajax") ? "html" : "script",
          success: function (data, textStatus) {
            content = $(data);
          }
        });
        break;
      }

      return content;
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
        index = anchors.index(this.getCurrentAnchor());
      anchors.filter(this._neighbours(anchors.length, index)).each(function () {
        //new Image().src = this.href;
      });
    },

    _neighbours: function (index, length) {
      return ":eq(" + (index === 0 ? length - 1 : index - 1) + "), :eq(" + (index === length - 1 ? 0 : index + 1) + ")";
    },

    _position: function (img) {
    },

    _resize: function () {
      var content = this.getContent(),
        viewer = this.lightbox,
        dialog = this.lightbox.data('dialog'),
        offset = 20,
        type = this._deriveType(this.getCurrentAnchor());

      if (type == 'image') {
        content.css({
          width: 'auto',
          height: 'auto'
        });
      }

      var cWidth = content.attr('width') || content.width(),
        cHeight = content.attr('height') || content.height(),

        // difference
        deltaContentWidth = viewer.outerWidth() - viewer.width(),
        deltaContentHeight = viewer.outerHeight() - viewer.height(),

        dialogTitlebarWidth = dialog.uiDialogTitlebar.outerWidth(),
        dialogTitlebarHeight = dialog.uiDialogTitlebar.outerHeight(),


        // Window
        wWidth = $(window).width(),
        wHeight = $(window).height(),

        // Desired width
        finalWidth = cWidth + deltaContentWidth,
        finalHeight = cHeight + deltaContentHeight + dialogTitlebarHeight,


        ratio = Math.min(
          Math.min(
            Math.min(wWidth - deltaContentWidth - offset, cWidth) / cWidth,
            Math.min(wHeight - deltaContentHeight - dialogTitlebarHeight - offset, cHeight) / cHeight, 1)),
        size = (this.size = {});

      $.extend(size, {
        width: Math.round(ratio * cWidth),
        height: Math.round(ratio * cHeight)
      });

      if (type == 'image') {
        content.css('width', size.width);
        content.css('height', size.height);
      }

      viewer.dialog('option', 'width', size.width + deltaContentWidth);
      viewer.dialog('option', 'height', size.height + deltaContentHeight + dialogTitlebarHeight);
      viewer.css({
        width: size.width + deltaContentWidth,
        height: size.height + deltaContentHeight
      });
    },

    setContent: function (content) {
      this._setData('content', content);
    },
    getContent: function () {
      return this._getData('content');
    },

    setCurrentAnchor: function (anchor) {
      this._setData('currentAnchor', anchor);
    },
    getCurrentAnchor: function () {
      return this._getData('currentAnchor');
    },

    _rotate: function (selectorA, selectorB, direction) {
      if (!this.getCurrentAnchor()) {
        console.log('Called _rotate without an anchor');
        return;
      }
      var anchors = this._anchors(),
        target = current = this.getCurrentAnchor();

      if (anchors.length === 1) {
        return;
      }

      target = anchors.filter(selectorA + anchors.index(current) + ")" + selectorB)[0];
      if (!target && this.options.loop && anchors.length > 1) {
        target = anchors.filter(selectorB)[0];
      }
      this.setCurrentAnchor(target);
      this.setContent(this._loadContent(target))
      this._display(direction);
    },

    _element: function (type, clazz) {
      return $("<" + type + "/>").addClass(clazz).hide();
    }
  });

  $.extend($.ui.lightbox, {
    defaults: {
      loop: true,
      overlay: true,
      dialogClass: 'ui-lightbox',
      resizable: false,
      draggable: false,
      selector: "a[href]:has(img[src])",
      titleSuffix: " - Click anywhere to close (or press Escape), use keyboard arrows or mousewheel to rotate images",
      position: 'center',
      width: 300,
      height: 200
    }
  });

})(jQuery);
