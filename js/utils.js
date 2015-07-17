Swarm.utils = {
	showLoadingIcon: function(selector){
		$(selector || "#content").html('<div id="loading-icon"><div class="la-square-spin la-2x"><div></div></div>');
	},

	hideLoadingIcon: function(){
		$("#loading-icon").remove();
	},

	buildFeedInfo: function (data, isSearch, feedContainer) {
    var self = this,
      container = $("#content"),
      msgs = data.messages,
      references = data.references,
      extendedThread = data.threaded_extended,
      str = [];

    // do this only for the first set of messages
    if (container.find('div.feed_main').length === 0) {
    	container.append('<div class="feed_main" />');
    }

    $.each(msgs, function (ind, msg) {
      var senderArrObj = $.grep(references, function (e) { return e.id == msg.sender_id; }),
        groupArrObj = $.grep(references, function (e) { return e.type === 'group' && e.id === msg.group_created_id }),
        sender = (senderArrObj.length > 0) ? senderArrObj[0] : {},
        group = (groupArrObj.length > 0) ? groupArrObj[0] : {},
        msgCreatedDate = Swarm.utils.getCreatedDate(msg.created_at);

      msg.sender = sender;
      msg.createdDate = msgCreatedDate;
      msg.extendedThread = extendedThread[msg.thread_id];
      msg.mainBody = msg.body.rich || msg.body.plain;
      msg.mainAttachment = msg.attachments.length ?
        (msg.attachments[0].inline_html || msg.attachments[0].comment || msg.attachments[0].content_excerpt || msg.attachments[0].name) :
        "";
      msg.group = group || { full_name: 'All Company' };
      msg.likedBy = {
        count: Math.max(0, msg.liked_by.count - 2),
        names: msg.liked_by.names.slice(0, 2)
      }
    });

    var feed = Swarm.templates.threads(data);
    if (feedContainer) {
      feedContainer.append(container.find('div.feed_main').append(feed));
    } else if (isSearch) {
      return feed;
    } else {
      container.find('div.feed_main').append(feed);
    }

    container.off("click", ".feed_main a.senderLinkAnc")
      .on("click", ".feed_main a.senderLinkAnc", function(){
        var target = $(this),
          userId = target.data("userid"),
          profileObj = new Swarm.Profile();

        $(window).off("scroll");
        profileObj.init(userId);
      });

    container.off("click", ".feed_main .msg_replies_number")
      .on("click", ".feed_main .msg_replies_number", function(){
        var target = $(this),
        msg_main = target.parents(".msg_details_main"),
        temp = [];
        if(msg_main.find('.reply_message').length==0) {
            temp.push('<div class="reply_message mui-form-group">');
            temp.push('<textarea name="message_body" class="mui-form-control" id="reply_body" rows="5" cols="37" autofocus/>');
            temp.push('<button class="post_button mui-btn mui-btn-primary mui-btn-raised mui-btn-flat">Post</button>');
            temp.push("</div>");
            msg_main.append(temp.join(''));
        }
      });

    container.off("click", ".feed_main .reply_message .post_button").on("click", ".feed_main .reply_message .post_button", function(){
        var target = $(this),
        msg_main = target.parents(".msg_main"),
        msgId = msg_main.data("msg-id"),
        reply_text = target.parent().find('textarea').val();
        jQuery.ajax({
            type :"POST",
            beforeSend: function (request)
            {
                request.setRequestHeader("Authorization", "Bearer "+yammer.getAccessToken());
            },
            url : "https://www.yammer.com/api/v1/messages.json?access_token="+yammer.getAccessToken(),
            data:{
                "replied_to_id":msgId,
                "body":reply_text
            },
            dataType: 'json',
            xhrFields: {
                withCredentials: false
            },
            success : function(data){
                // show the message thread if the reply is success
                target.parents(".msg_details_main").find('.msg_body').trigger("click", [true]);
            },
            error : function(){
                alert("error");
            }
        });

    });

    container.off("click", ".feed_main .msg_like_number").on("click", ".feed_main .msg_like_number", function(){
        var target = $(this),
        msg_main = target.parents(".msg_main"),
        msgId = msg_main.data("msg-id");
        jQuery.ajax({
            type :"POST",
            beforeSend: function (request)
            {
                request.setRequestHeader("Authorization", "Bearer "+yammer.getAccessToken());
            },
            url : 'https://www.yammer.com/api/v1/messages/liked_by/current.json?message_id='+msgId+'&access_token='+yammer.getAccessToken(),
            data:{
                "message_id" : msgId
            },
            dataType: 'text',
            xhrFields: {
                withCredentials: false
            },
            success : function(data){
                var like_number = parseInt(target.find('span').text());
                target.find('span').html(like_number+1);

            },
            error : function(){
                //Swarm.utils.hideLoadingIcon();
                alert("like error");
            }
        });
    });

    container.off("click", ".feed_main .msg_body").on("click", ".feed_main .msg_body", function(){
        var self = this;
        var target = $(this),
        threadId = target.data("thread-id");
        jQuery.ajax({
            type :"GET",
            url : 'https://www.yammer.com/api/v1/messages/in_thread/'+threadId+'.json?access_token='+yammer.getAccessToken(),
            data:{
                "limit":10
            },
            dataType: 'json',
            xhrFields: {
                withCredentials: false
            },
            success : function(data){

                container.empty();
                container.slimScroll().off('slimscroll');
                container.slimScroll().removeData('events');
                Swarm.utils.hideLoadingIcon();
                data.messages.reverse();
                Swarm.utils.buildFeedInfo(data);
                $('div.msg_main').slice(1).css({'width': '300px','float': 'right',
                                                'border-left': '3px solid #71a6f6',
                                                'background': '#f3f5f8'});

            },
            error : function(){
                Swarm.utils.hideLoadingIcon();
                alert("error");
        }
    });

  });
},


showSearchResults:function(data){
    var self = this;
    container = $("#content"),
    profile = data,
    str = [];
    str.push('<div>');
    str.push('<div>Users '+data.count.users+'</div>');
    str.push('<div>Messages '+data.count.messages+'</div>');
    str.push('<div>Groups '+data.count.groups+'</div>');
    str.push('<div>Pages '+data.count.pages+'</div>');
    str.push('<div>Topics '+data.count.topics+'</div>');

    //messages
    str.push('<div>'+Swarm.utils.buildFeedInfo(data.messages)+'</div>');
    //users

    str.push('</div>');
    container.empty().html(str.join(''));
},

showProfile: function(data) {
  var self = this,
    container = $("#content");

  data.mugshot_url_template = data.mugshot_url_template.replace("{width}x{height}","100x100"),
  data.active_since = self.getActiveDuration(new Date(data.activated_at.toString()));

  container.empty().html(Swarm.templates.user_profile(data));
  container.slimScroll().off('slimscroll');
  container.slimScroll().removeData('events');
},

getActiveDuration : function(date){
    var self = this,
      firstDate = date,
      secondDate = new Date();

    return self.getTimeDuration(firstDate, secondDate);
},

getTimeDuration : function(date_1, date_2){
    var self = this;
    //convert to UTC
    var date2_UTC = new Date(Date.UTC(date_2.getUTCFullYear(), date_2.getUTCMonth(), date_2.getUTCDate()));
    var date1_UTC = new Date(Date.UTC(date_1.getUTCFullYear(), date_1.getUTCMonth(), date_1.getUTCDate()));

    //--------------------------------------------------------------
    var days = date2_UTC.getDate() - date1_UTC.getDate();
    if (days < 0){
        date2_UTC.setMonth(date2_UTC.getMonth() - 1);
        days += self.daysInMonth(date2_UTC);
    }
    //--------------------------------------------------------------
    var months = date2_UTC.getMonth() - date1_UTC.getMonth();
    if (months < 0){
        date2_UTC.setFullYear(date2_UTC.getFullYear() - 1);
        months += 12;
    }

    //--------------------------------------------------------------
    var years = date2_UTC.getFullYear() - date1_UTC.getFullYear();
    var result = '';
    if (years > 1){
        result += years + " years ";
    }
    if (months > 1){
        result += months + " months ";
    }
    if (days > 1){
        result += days+" days";
    }

    return result;
},

daysInMonth : function (date2_UTC){
    var monthStart = new Date(date2_UTC.getFullYear(), date2_UTC.getMonth(), 1);
    var monthEnd = new Date(date2_UTC.getFullYear(), date2_UTC.getMonth() + 1, 1);
    var monthLength = (monthEnd - monthStart) / (1000 * 60 * 60 * 24);
    return monthLength;
},
getPhoneNumberInfo : function(phoneNumbers){
    var self = this,
    result = [];
    for(var phoneNumber in phoneNumbers){
        result.push('<div>');
            result.push('<div class="phoneType">'+phoneNumbers[phoneNumber].type+'</div>');
            result.push('<div class="phoneNumber"> '+phoneNumbers[phoneNumber].number+'</div>');
        result.push('</div>');
    }
    return result.join('');
},
getEmptyStringIfNull : function(data){
    var self = this;
    if(data == null || data == undefined){
        return "";
    }
    return data;
},

  getCreatedDate: function (msgCreatedDate) {
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      todayDate = new Date(),
      msgDate = new Date(msgCreatedDate);

    if (todayDate.getDate() === msgDate.getDate() && todayDate.getMonth() === msgDate.getMonth() && todayDate.getFullYear() === msgDate.getFullYear()) {
        var minutes = msgDate.getMinutes();
        minutes = minutes < 10 ? ('0' + minutes) : minutes;
        msgCreatedDate = msgDate.getHours() + ":" + minutes;
    } else {
        msgCreatedDate = monthNames[msgDate.getMonth()] + " " + msgDate.getDate();
    }

    return msgCreatedDate;
  }

}
