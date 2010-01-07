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
            closeOnEscape: this.options.closeOnEscape,
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
            }
          }));

      // consider event delegation to make this more dynamic
      $(this.options.selector, this.element).click(function (event) {
        event.preventDefault();
        self._showLoadingIndicator();

        var content,
          viewer = self.lightbox;

        viewer.dialog('option', 'show', self.options.show);

        content = self._loadContent(this);
        self.setCurrentAnchor(this);
        self._display(content);
        return false;
      });
      $(document).keydown(function (event) {
        if (!self.lightbox.dialog('isOpen')) {
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
        if (!self.lightbox.dialog('isOpen')) {
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
          if (!self.lightbox.dialog('isOpen')) {
            return;
          }
          event.preventDefault();
          if (self.lightbox.is(":animated")) {
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

      this.loadingIndicatorTimeout = setTimeout(function() {
        if (!self.loadingIndicator) {
          self.loadingIndicator = self._element("div", "ui-loading-indicator ui-corner-all").appendTo(document.body);
        }
        self.loadingIndicator.fadeIn("slow");
      }, 250);
    },

    _hideLoadingIndicator: function () {
      clearTimeout(this.loadingIndicatorTimeout);
      if (this.loadingIndicator) {
        this.loadingIndicator.hide();
      }
    },

    close: function () {
      if (!this.lightbox.dialog('isOpen')) {
        return;
      }
      var self = this,
        anchor = this.getCurrentAnchor(),
        viewer = this.lightbox;

      // TODO: these need to be destroyed with the widget.
      viewer.dialog('close');
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

    _display: function (content) {
      if (!content) {
        return;
      }

      var self = this,
        visible = this.lightbox.dialog('isOpen'),
        anchor = this.getCurrentAnchor(),
        type = this._deriveType(this.getCurrentAnchor()),
        viewer = this.lightbox;

      viewer.dialog('option', 'title', $(anchor).attr('title') + this.options.titleSuffix);

      if (visible) {
        viewer.dialog('close');
      }
      viewer.empty();
      viewer.append(content.show());
      this._resize(content);
      viewer.dialog('open');
      viewer.dialog('option', 'hide', self.options.hide);
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
          type: (parseInt(self.options.post, 10) === 1) ? "POST" : "GET",
          cache: true,
          async: false,
          data: self.options.parameters,
          dataType: (type === "ajax") ? "html" : "script",
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

    _resize: function (content) {
      var viewer = this.lightbox,
        dialog = this.lightbox.data('dialog'),
        offset = 20,
        type = this._deriveType(this.getCurrentAnchor()),
        cWidth,cHeight,finalWidth,finalHeight,
        // difference
        deltaContentWidth = viewer.outerWidth() - viewer.width(),
        deltaContentHeight = viewer.outerHeight() - viewer.height(),

        dialogTitlebarWidth = dialog.uiDialogTitlebar.outerWidth(),
        dialogTitlebarHeight = dialog.uiDialogTitlebar.outerHeight(),

        // Window
        wWidth = $(window).width(),
        wHeight = $(window).height(),

        size = (this.size = {});

      $.swap(content[0], {
        position: "absolute",
        visibility: "hidden",
        display: "block"
      }, function () {
        cWidth = $(this).attr('width') || $(this).width(),
        cHeight = $(this).attr('height') || $(this).height();
      });

      // Desired width
      finalWidth = cWidth + deltaContentWidth,
      finalHeight = cHeight + deltaContentHeight + dialogTitlebarHeight,

      ratio = Math.min(
        Math.min(
          Math.min(wWidth - deltaContentWidth - offset, cWidth) / cWidth,
          Math.min(wHeight - deltaContentHeight - dialogTitlebarHeight - offset, cHeight) / cHeight, 1)),


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

    setCurrentAnchor: function (anchor) {
      this._setData('currentAnchor', anchor);
    },
    getCurrentAnchor: function () {
      return this._getData('currentAnchor');
    },

    _rotate: function (selectorA, selectorB, direction) {
      var self = this,
        content,
        anchors = this._anchors(),
        target = current = this.getCurrentAnchor(),
        viewer = this.lightbox;

      if (!this.getCurrentAnchor()) {
        console.log('Called _rotate without an anchor');
        return;
      }

      if (anchors.length === 1) {
        return;
      }

      this._showLoadingIndicator();

      target = anchors.filter(selectorA + anchors.index(current) + ")" + selectorB)[0];
      if (!target && this.options.loop && anchors.length > 1) {
        target = anchors.filter(selectorB)[0];
      }

      viewer.dialog('option', 'hide', this.options.rotateOut(direction))
        .dialog('option', 'show', this.options.rotateIn(direction));
      this.setCurrentAnchor(target);
      content = this._loadContent(target);
      this._display(content);
    },

    _element: function (type, clazz) {
      return $("<" + type + "/>").addClass(clazz).hide();
    }
  });

  $.extend($.ui.lightbox, {
    defaults: {
      loop: true,
      overlay: true,
      post: 0,
      dialogClass: 'ui-lightbox',
      closeOnEscape: true,
      resizable: false,
      draggable: false,
      selector: "a[href]:has(img[src])",
      titleSuffix: "",
      position: 'center',
      width: 'auto',
      height: 'auto',
      parameters: {},
      rotateIn: function (direction) {
        return 'slide' + { up: "down", down: "up", left: "right", right: "left" }[direction];
      },
      rotateOut: function (direction) {
        return 'slide' + direction;
      },
      show: '',
      hide: ''
    }
  });

$.effects.slideup = function (o) {
  o.options.direction = 'up';
  return $(this).effect('slide', o.options, o.duration, o.callback);
};

$.effects.slidedown = function (o) {
  o.options.direction = 'down';
  return $(this).effect('slide', o.options, o.duration, o.callback);
};

$.effects.slideleft = function (o) {
  o.options.direction = 'left';
  return $(this).effect('slide', o.options, o.duration, o.callback);
};

$.effects.slideright = function (o) {
  o.options.direction = 'right';
  return $(this).effect('slide', o.options, o.duration, o.callback);
};

})(jQuery);
