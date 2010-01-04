/*globals Drupal,$ */

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
(function($) {

  $.widget('ui.lightbox', {
    _init: function() {
      var self = this;
      // consider event delegation to make this more dynamic
      $(this.options.selector, this.element).click(function(event) {
        event.preventDefault();
        if (self.overlayElement || self.viewerElement)
          return;
        self._display(this);
        return false;
      });
      $(document).click(function(event) {
        // ignore right click
        if (event.button != 2)
          self.close();
      }).keydown(function(event) {
        if (!self.currentAnchor)
          return;
        switch(event.keyCode) {
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
      $(window).resize(function() {
        if (!self.currentAnchor)
          return;
        self._resize(self._viewer().find("img"));
        self._position(self._viewer());
      });
      if ($.fn.mousewheel) {
        $(document).mousewheel(function(event, delta) {
          if (!self.currentAnchor)
            return;
          event.preventDefault();
          if (self.viewerElement.is(":animated"))
            return;
          if (delta < 0) {
            self.next("down");
          }
          if (delta > 0) {
            self.prev("up");
          }
        });
      }
    },

    _showLoadingIndicator: function() {
      var self = this;
      this.loadingIndicatorTimeout = setTimeout(function() {
        if (!self.loadingIndicator) {
          self.loadingIndicator = self._element("div", "ui-loading-indicator ui-corner-all").appendTo(document.body);
        }
        self._position(self.loadingIndicator);
        self.loadingIndicator.fadeIn("slow");
      }, 250);
    },

    _hideLoadingIndicator: function() {
      clearTimeout(this.loadingIndicatorTimeout);
      this.loadingIndicator && this.loadingIndicator.hide();
    },

    close: function() {
      if (!this.currentAnchor)
        return;
      var self = this;
      var anchor = this.currentAnchor;
      this.currentAnchor = null;

      // client has to invoke callbacks, but scope/args don't matter
      var viewer = this._viewer();
      this.options.hide.call(viewer[0], anchor, function() {
        viewer.remove();
        self.viewerElement = null;
      });
      var overlay = this._overlay();
      this.options.hideOverlay.call(overlay[0], function() {
        overlay.remove();
        self.overlayElement = null;
      });
    },

    next: function(direction) {
      this._rotate(":gt(", ":first", direction || "up");
    },

    prev: function (direction) {
      this._rotate(":lt(", ":last", direction || "down");
    },

    _anchors: function () {
      // if deemed necessary, cache selection here
      return this.element.find(this.options.selector);
    },

    _display: function (anchor, direction) {
      if (!anchor)
        return;

      var self = this,
        visible = this.viewerElement && this.viewerElement.is(":visible");

      this.currentAnchor = anchor;

      if (direction) {
        var previous = this._viewer();
        this.options.rotateOut.call(previous[0], direction, function() {
          previous.remove();
        });
      }
      this._showLoadingIndicator();

      this._viewer("new", this._loadContent(anchor), {
        autoOpen: true,
        draggable: false,
        modal: true,
        open: function (event, ui) {
          $('.ui-dialog-buttonpane button', $(this).parents('.ui-dialog')).each(function (index, domElement) {
            $(domElement).addClass('button-' + index);
          });
          self._trigger('load');
          self._hideLoadingIndicator();
          self._resize($(self));
          self._position($(self).parent());
        }
      });

      /*
      this._viewer("new").attr("title", anchor.title + this.options.titleSuffix).children("img").one("load", function() {
        self._overlay().attr("title", anchor.title + self.options.titleSuffix)
        if (visible) {
          self.options.rotateIn.call($this[0], {
            up: "down",
            down: "up",
            left: "right",
            right: "left"
          }[direction]);
        } else {
          self._overlay().css({
            left: $(window).scrollLeft(),
            top: $(window).scrollTop()
          }).each(self.options.showOverlay);
          self.options.show.call($this, anchor);
        }
        self._preloadNeighbours();
      }).attr("src", anchor.href);
      */
    },

    _loadContent: function(anchor) {
      var content = 'nothing';
      switch (this.options.type) {
        case "image":
          content = new Image();
          $(content).load(function() {
            content = $(this);
            //onContentReady();
          })
          .attr("src", anchor.href);
          break;
        case "flash":
        case "flashvideo":
        case "quicktime":
        case "realplayer":
        case "windowsmedia":
          content = $("<div/>").media({width: options.width, height: options.height, src: anchor.href, autoplay: 1});
          break;
        case "iframe":
          content = $('<iframe/>').attr('src', anchor.href).attr('frameborder', 0).attr('border', 0);
          break;
        case "html":
        case "dom":
          var reference = $(options.reference);
          if (reference.context) {
            var marker = $("<div></div>").attr({
                           id     :  reference.markerId(),
                           "class": (reference.is(":hidden") ? "hidden" : ""),
                           style  : "display: none"
                         });
            content = $("<div></div>").append(reference.before(marker).addClass("marked"));
            reference.show();
          }
          break;
        case "ajax":
        case "script":
          $.ajax({
            url: anchor.href,
            type: (parseInt(this.options.post, 10) == 1) ? "POST" : "GET",
            cache: false,
            async: false,
            //data: options.parameters,
            dataType: (this.options.type == "ajax") ? "html" : "script",
            success: function(data, textStatus) {
              content = $(data);
            }
          });
      }

      if ($.inArray(this.options.type, ["html", "dom", "iframe"]) != -1) {
        //onContentReady();
      }

      return content;
    },
    _preloadNeighbours: function() {
      var anchors = this._anchors(),
        index = anchors.index(this.currentAnchor);
      anchors.filter(this._neighbours(anchors.length, index)).each(function() {
        new Image().src = this.href;
      });
    },

    _neighbours: function(index, length) {
      return ":eq(" + (index == 0 ? length - 1 : index - 1) + "), :eq(" + (index == length - 1 ? 0 : index + 1) + ")";
    },

    _position: function(img) {
      img.css({
        left: $(window).width() / 2 - img.outerWidth() / 2 + $(window).scrollLeft(),
        top: $(window).height() / 2 - img.outerHeight() / 2 + $(window).scrollTop()
      });
    },

    _resize: function(img) {
      // TODO cleanup
      var imgx = img.parent();
      if ($.browser.msie) {
        img.css("width", "auto");
      }
      imgx.css("width", "").css("height", "");
      var outerWidth = imgx.width(),
        outerHeight = imgx.height(),
        ratio = Math.min(Math.min($(window).width() - 36, outerWidth) / outerWidth, Math.min($(window).height() - 60, outerHeight) / outerHeight);
      img.css("width", "");
      //console.log(imgx.outerWidth(), imgx.outerHeight(), imgx.width(), imgx.height())
      //console.log(img, outerWidth, outerHeight, borderWidth, borderHeight, ratio)
      ratio = Math.min(ratio, 1);
        imgx.css({
          width: Math.round(ratio * outerWidth),
          height: Math.round(ratio * outerHeight)
        });
    },

    _rotate: function(selectorA, selectorB, direction) {
      if (!this.currentAnchor)
        return;
      var anchors = this._anchors();
      var target = anchors.filter(selectorA + anchors.index(this.currentAnchor) + ")" + selectorB)[0];
      if (!target && this.options.loop && anchors.length > 1) {
        target = anchors.filter(selectorB)[0];
      }
      this._display(target, direction);
    },

    _viewer: function(create, content, options) {
      if (create || !this.viewerElement) {
        this.viewerElement = $(content).appendTo(document.body).dialog(options);
      }
      return this.viewerElement;
    },

    _overlay: function() {
      if (!this.options.overlay)
        return $([]);
      if (!this.overlayElement) {
        this.overlayElement = this._element("div", "ui-widget-overlay").appendTo(document.body);
      }
      return this.overlayElement;
    },

    _element: function(type, clazz) {
      return $("<" + type + "/>").addClass(clazz).hide();
    }

  });

  $.extend($.ui.lightbox, {
    defaults: {
      loop: true,
      overlay: true,
      selector: "a[href]:has(img[src])",
      titleSuffix: " - Click anywhere to close (or press Escape), use keyboard arrows or mousewheel to rotate images",
      rotateIn: function(direction) {
        $(this).effect("drop", {
          direction: direction,
          mode: "show"
        });
      },
      rotateOut: function(direction, finished) {
        $(this).effect("drop", {
          direction: direction
        }, "normal", finished);
      },
      show: function(anchor) {
        var thumb = $(anchor),
          offset = thumb.offset();
        // TODO refactor
        var start = {
          left: offset.left,
          top: offset.top,
          width: thumb.width(),
          height: thumb.height(),
          opacity: 0
        }
        var img = $(this);
        var stop = {
          left: img.css("left"),
          top: img.css("top"),
          width: img.width(),
          height: img.height(),
          opacity: 1
        }
        $(this).css(start).show().animate(stop);
      },
      showOverlay: function() {
        $(this).fadeIn();
      },
      hide: function(anchor, finished) {
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
      },
      hideOverlay: function(finished) {
        $(this).fadeOut(finished);
      }
    }
  });

})(jQuery);
