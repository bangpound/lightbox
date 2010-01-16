# jQuery UI Lightbox

My goals with this lightbox script are to leverage jQuery UI widgets where possible and to support any media type.

The lightbox widget is a controller for jQuery UI Dialog widgets. Each lightbox widget instance collects HTML anchors into a simple gallery. Only one anchor in a lightbox widget's collection can be viewed at a time, but the viewed element can change without closing the lightbox.

When a link is clicked, the lightbox widget loads the linked content and instantiates a jQuery UI Dialog widget. If the lightbox collection contains multiple items, keyboard and UI button navigation can page forward and backward.

Linker functions are responsible for transforming the anchor's HREF into DOM elements. Currently linker functions exist to load images, in-DOM content, content loaded by AJAX/AHAH, multimedia supported by the [jQuery Media][Media] plugin, and oEmbed content supported by the [jQuery oEmbed][oEmbed] plugin.

[Media]: http://malsup.com/jquery/media/
[oEmbed]: http://code.google.com/p/jquery-oembed/

## Requirements

This widget was written for jQuery 1.2.6 and jQuery UI 1.6.

## Usage

The lightbox widget is applied to a DOM element that contains all of the anchors you want to render as lightboxes. The *selector* option targets the individual anchors within that container.

    $('#gallery').lightbox();

Without any options, the lightbox widget will create a gallery of all anchors that contain images (thumbnails).

    $('#gallery').lightbox({
      loop: true,                       // Loops to the beginning of the gallery
                                        // after paging past last element.
      modal: true,                      // creates a modal overlay.
      selector: "a[href]:has(img[src])" // Target the anchors that should open
                                        // as lightboxes.
    });

Handling content size is tricky, especially with AJAX/AHAH loaded content. This script tries its best to determine the size of the content before displaying it. This example works for loaded content that contains an image. The width of the lightbox is constrained to be the width of the image.

    $('#gallery').lightbox({
      constrain: 'width',
      measure: 'img'
    });

Individual anchors can be configured with the [jQuery Metadata][Metadata] plugin. This enables you to reliably mix content types in the same gallery.

[Metadata]: http://plugins.jquery.com/project/metadata

### Drupal integration

I wrote this for a Drupal site, and I've included the code that I use to load the script. The widget requires jQuery UI, but only *this* sample implementation has specific Drupal dependencies.

* [jQuery UI](http://drupal.org/project/jquery_ui)
* [jQ](http://drupal.org/project/jq)

To add the script and options to your Drupal page, simply call

    jq_add('lightbox', $target, $options);

The $target is the container of your anchors. The $options is an associative array
of options. For example, the third usage example above would be expressed as:

    jq_add('lightbox', '#gallery', array(
      'constrain' => 'width',
      'measure' => 'img'
    ));

I'm calling `jq_add` from `HOOK_preprocess_views_view` to create a lightbox gallery from the output of a view, but there are also ways to use the script without Views.

## Credits

While developing this widget, I referred to and used code from the open source licensed [jQuery UI Photoviewer][Photoviewer] widget (in development) and the [TopUp][TopUp] lightbox.

[Photoviewer]: http://wiki.jqueryui.com/Photoviewer
[TopUp]: http://gettopup.com/
