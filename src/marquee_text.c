#include "pebble.h"
#include "pebble_fonts.h"
#include "marquee_text.h"

// This code is not generally useful unless this value is set to zero.
// There is a bug in the text drawing routines that causes glitches as
// characters gain a negative position. So we lie about our frame, ensuring
// That this never comes up. But then we have no good way of clipping them.
#define BOUND_OFFSET 20

static MarqueeTextLayer* head;

static void do_draw(Layer* layer, GContext* context);


MarqueeTextLayer* marquee_text_layer_create(GRect frame) {
    
	MarqueeTextLayer *marquee = layer_create_with_data(frame, sizeof(MarqueeData));
	MarqueeData *marqueedata = (MarqueeData *)layer_get_data(marquee);
	//APP_LOG(APP_LOG_LEVEL_DEBUG, "marquee_text_layer_create: malloc MarqueeTextLayer");
	//APP_LOG(APP_LOG_LEVEL_DEBUG, "marquee_text_layer_create: got a marquee pointer, allocated %d bytes at %p", sizeof(MarqueeTextLayer), marquee);
	
	marqueedata->text = malloc(128); // allocate some bytes for the string
	if (marqueedata->text)
		APP_LOG(APP_LOG_LEVEL_DEBUG, "allocated 128 bytes for marquee->text at %p", marqueedata->text);
	
	
	// And now we lie about our frame. See above.
    //frame.origin.x -= BOUND_OFFSET;
    //frame.size.w += BOUND_OFFSET;
	
	layer_set_frame(marquee,GRect(frame.origin.x - BOUND_OFFSET,frame.origin.y,frame.size.w + BOUND_OFFSET, frame.size.h));
	APP_LOG(APP_LOG_LEVEL_DEBUG, "frame.origin.x = %d, frame.origin.y = %d, frame.size.w = %d, frame.size.h = %d", layer_get_frame(marquee).origin.x, layer_get_frame(marquee).origin.y, layer_get_frame(marquee).size.w, layer_get_frame(marquee).size.h);
	
    //GRect bounds = layer_get_bounds(marquee);
    //APP_LOG(APP_LOG_LEVEL_DEBUG, "pre bounds.origin.x = %d, bounds.origin.y = %d, bounds.size.w = %d, bounds.size.h = %d", bounds.origin.x, bounds.origin.y, bounds.size.w, bounds.size.h);
	//bounds.origin.x += BOUND_OFFSET + 25;
    //APP_LOG(APP_LOG_LEVEL_DEBUG, "post adjust bounds.origin.x = %d, bounds.origin.y = %d, bounds.size.w = %d, bounds.size.h = %d", bounds.origin.x, bounds.origin.y, bounds.size.w, bounds.size.h);
	//layer_set_bounds(marquee, bounds);
	layer_set_bounds(marquee,GRect(layer_get_bounds(marquee).origin.x + BOUND_OFFSET,0,frame.size.w + BOUND_OFFSET, frame.size.h));
	APP_LOG(APP_LOG_LEVEL_DEBUG, "post set bounds.origin.x = %d, bounds.origin.y = %d, bounds.size.w = %d, bounds.size.h = %d", layer_get_bounds(marquee).origin.x, layer_get_bounds(marquee).origin.y, layer_get_bounds(marquee).size.w, layer_get_bounds(marquee).size.h);
    marqueedata->background_colour = GColorWhite;
    marqueedata->text_colour = GColorBlack;
    marqueedata->offset = 0;
	marqueedata->text_width = -1;
    marqueedata->countdown = 100;
    marqueedata->font = fonts_get_system_font(FONT_KEY_FONT_FALLBACK);

	layer_set_clips(marquee, false);
	layer_set_update_proc(marquee, do_draw);
	marquee_text_layer_mark_dirty(marquee);
		
	return marquee;
}


void marquee_text_layer_destroy(MarqueeTextLayer *marquee) {
	layer_destroy(marquee);
}

void marquee_text_layer_set_text(MarqueeTextLayer *marquee, const char *text) {
	MarqueeData *marqueedata = (MarqueeData *)layer_get_data(marquee);
    marqueedata->text = text;
    marquee_text_layer_mark_dirty(marquee);
	APP_LOG(APP_LOG_LEVEL_DEBUG, "marquee_text_layer_set_text");
}

void marquee_text_layer_set_font(MarqueeTextLayer *marquee, GFont font) {
	MarqueeData *marqueedata = (MarqueeData *)layer_get_data(marquee);
    marqueedata->font = font;
    marquee_text_layer_mark_dirty(marquee);
	APP_LOG(APP_LOG_LEVEL_DEBUG, "marquee_text_layer_set_font");
}

void marquee_text_layer_set_text_color(MarqueeTextLayer *marquee, GColor color) {
	MarqueeData *marqueedata = (MarqueeData *)layer_get_data(marquee);
    marqueedata->text_colour = color;
    marquee_text_layer_mark_dirty(marquee);
	APP_LOG(APP_LOG_LEVEL_DEBUG, "marquee_text_layer_set_text_color");
}

void marquee_text_layer_set_background_color(MarqueeTextLayer *marquee, GColor color) {
	MarqueeData *marqueedata = (MarqueeData *)layer_get_data(marquee);
    marqueedata->background_colour = color;
    marquee_text_layer_mark_dirty(marquee);
	APP_LOG(APP_LOG_LEVEL_DEBUG, "marquee_text_layer_set_background_color");
}

void marquee_text_layer_mark_dirty(MarqueeTextLayer *marquee) {
    MarqueeData *marqueedata = (MarqueeData *)layer_get_data(marquee);
    marqueedata->text_width = -1;
    marqueedata->offset = 0;
    marqueedata->countdown = 100;
    layer_mark_dirty(marquee);
}



/*
void marquee_text_layer_tick() {
	MarqueeData *marqueedata = (MarqueeData *)layer_get_data(marquee);
	MarqueeTextLayer *marquee = head;
	while(marquee) {
		if(marqueedata->countdown > 0) {
			--marqueedata->countdown;
			goto next;
		}
		marqueedata->offset += 1;
		layer_mark_dirty(marquee->layer);
	next:
		marquee = marquee->previous;
	}
}
*/

static void do_draw(MarqueeTextLayer* marquee, GContext* context) {

	MarqueeData *marqueedata = (MarqueeData *)layer_get_data(marquee);
	if(marqueedata->text[0] == '\0') {
		APP_LOG(APP_LOG_LEVEL_DEBUG, "returning due to empty string");
		return; // empty strings are very bad.
	}
	//APP_LOG(APP_LOG_LEVEL_DEBUG, "checked text = %s, offset = %d", marqueedata->text, marqueedata->offset);
    if(marqueedata->text_width == -1) {
		
        marqueedata->text_width = graphics_text_layout_get_content_size(marqueedata->text, marqueedata->font, GRect(0, 0, 1000, layer_get_frame(marquee).size.h), GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft).w;
		APP_LOG(APP_LOG_LEVEL_DEBUG, "got text width: %d", marqueedata->text_width);
		
	}
    graphics_context_set_fill_color(context, marqueedata->background_colour);
    graphics_context_set_text_color(context, marqueedata->text_colour);
    //graphics_fill_rect(context, layer_get_bounds(marquee), 0, GCornerNone);
	//graphics_fill_rect(context, GRect(20,20,20,20), 0, GCornerNone);

	
	
	if(marqueedata->text_width < layer_get_frame(marquee).size.w - BOUND_OFFSET) {
		// I think this is saying - text is shorter than frame, so no need to marquee
		//APP_LOG(APP_LOG_LEVEL_DEBUG, "drawing 1, text width = %d", marqueedata->text_width);
        GRect rect = GRectZero;
        rect.size = layer_get_bounds(marquee).size;
        rect.size.w -= BOUND_OFFSET;
		graphics_draw_text(context, marqueedata->text, marqueedata->font, rect, GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);
		return;
	}
	
	
    if(marqueedata->offset > marqueedata->text_width + BOUND_OFFSET) {

		APP_LOG(APP_LOG_LEVEL_DEBUG, "resetting since offset is %d which is more than text_width %d + offset %d", marqueedata->offset, marqueedata->text_width, BOUND_OFFSET);
		APP_LOG(APP_LOG_LEVEL_DEBUG, "frame.origin.x = %d, frame.origin.y = %d, frame.size.w = %d, frame.size.h = %d", layer_get_frame(marquee).origin.x, layer_get_frame(marquee).origin.y, layer_get_frame(marquee).size.w, layer_get_frame(marquee).size.h);
		APP_LOG(APP_LOG_LEVEL_DEBUG, "bounds.origin.x = %d, bounds.origin.y = %d, bounds.size.w = %d, bounds.size.h = %d", layer_get_bounds(marquee).origin.x, layer_get_bounds(marquee).origin.y, layer_get_bounds(marquee).size.w, layer_get_bounds(marquee).size.h);
		APP_LOG(APP_LOG_LEVEL_DEBUG, "bounds.origin.x = %d, bounds.origin.y = %d, bounds.size.w = %d, bounds.size.h = %d", layer_get_bounds(marquee).origin.x, layer_get_bounds(marquee).origin.y, layer_get_bounds(marquee).size.w, layer_get_bounds(marquee).size.h);
		// reached the end? reset
        marqueedata->offset = 0;
		marqueedata->countdown = 100;
    }
	
	// keep increasing offset until it reaches text_width
    if(marqueedata->offset < marqueedata->text_width) {
		//APP_LOG(APP_LOG_LEVEL_DEBUG, "drawing 2 -offset = %d", -marqueedata->offset);
        
		//graphics_draw_rect(context, GRect(-marqueedata->offset, 2, marqueedata->text_width, 30));
		
		graphics_draw_text(context, marqueedata->text, marqueedata->font, 
						   	GRect(-marqueedata->offset, 0, marqueedata->text_width, layer_get_frame(marquee).size.h),
						   	GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);

		
		
		//Draw the text into the frame with negative offset
			
    }
    if(marqueedata->offset > marqueedata->text_width - layer_get_frame(marquee).size.w + BOUND_OFFSET) {
		//APP_LOG(APP_LOG_LEVEL_DEBUG, "drawing 3 -offset = %d", -marqueedata->offset);
        graphics_draw_text(context, marqueedata->text, marqueedata->font, 
						   GRect(-marqueedata->offset + marqueedata->text_width + BOUND_OFFSET, 0, marqueedata->text_width, layer_get_frame(marquee).size.h)
						   , GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
		
		//graphics_draw_rect(context, GRect(-marqueedata->offset + marqueedata->text_width + BOUND_OFFSET, 5
		//								  	, marqueedata->text_width, 10));		
		
    }
    //APP_LOG(APP_LOG_LEVEL_DEBUG, "drawing hack");
	// And draw our hack, too:
   // graphics_fill_rect(context, GRect(-BOUND_OFFSET, 0, BOUND_OFFSET, layer_get_frame(marquee).size.h), 0, GCornerNone);
   
}
