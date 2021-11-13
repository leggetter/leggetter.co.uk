//window.onerror = function(){}

$(function() {
  var img = $('<img src="scarey_alien.png" />');
  img.addClass('alien');
  $('body').append(img)
  
  var updates = [];
  var timePre = '<span class="f">Just now – </span>';
  updates.push(createResult('Aliens appear over earth!',
                                 'http://news.bbc.co.uk/aliens',
                                 'Rising greenhouse emissions could tip off aliens that we are a rapidly ... the authors entertain sees humanity triumph over a more powerful alien ..... I hope if these aliens do come to Earth and we ask "Great aliens, how do we'));
  updates.push(createImageResult());
  
  var clicks = 0;
  $('body').click(function() {
    if(updates[clicks]){
      var el = $(updates[clicks]);
      el.hide();
      $('#rso').prepend(el);
      el.fadeIn('show').effect("highlight", {}, 3000);
      ++clicks;
    }
    else {
      img.addClass('drop-in');
      if(top.alienDropIn) {
        top.alienDropIn();
      }
    }
  });
  
  function createResult(title, link, body) {
  var html = '<li id="mbb3" class="g"><div class="vsc" pved="0CF8QkgowAg" sig="h0v" rawurl="' + link + '"><h3 class="r"><a href="' + link + '" class="l" >' + title + '</a></h3><div class="vspib" aria-label="Result details" role="button" tabindex="0"><div class="vspii"><div class="vspiic"></div></div></div><div class="s"><div class="f kv"><cite>' + link + '</cite><span class="vshid"><a href="#">Cached</a>&nbsp;-&nbsp;<a href="#">Similar</a></span><button class="gbil esw eswd"></button></div><div class="esc slp" id="poS2" style="display:none">You +1\'d this publicly.&nbsp;<a href="#" class="fl">Undo</a></div><span class="st">' + timePre + body + ' <b>...</b><br></span></div></div><div id="mbf3"><span></span></div><!--n--></li>';
  
    return html;
  };
  
  function createImageResult() {
    var html = '<div id="ires"><ol eid="vFQwT9WLKsXotQaEsrWxBA" id="rso"><li class="g" id="imagebox_bigimages"><h3 class="r inl"><a href="/search?q=alien+sightings&amp;hl=en&amp;biw=1440&amp;bih=702&amp;prmd=imvns&amp;tbm=isch&amp;tbo=u&amp;source=univ&amp;sa=X&amp;ei=vFQwT9WLKsXotQaEsrWxBA&amp;sqi=2&amp;ved=0CD8QsAQ">Images for <em>aliens</em></a></h3>&nbsp;-&nbsp;<span class="bl"><span class="gl" id="irl_r"><a href="#" id="irl_r_a" >Report images</a></span><span id="irl_t" style="display:none">Thank you for the feedback.</span><span class="gl" id="irl_m" style="display:none"> <a href="#" id="irl_m_a" >Report another image</a></span><span id="irl_p" style="display:none">Please report the offensive image. </span><span class="gl" id="irl_c" style="display:none"><a href="#" id="irl_c_a" >Cancel</a></span><span class="gl" id="irl_d" style="display:none"><a href="#" id="irl_d_a" >Done</a></span></span><div id="iur" class="rg_r" style="margin-top:3px"><div><div style="height:96px;overflow:hidden"><ul class="rg_ul"><!--m--><li class="bili uh_r" style="height:90px;position:relative;width:142px"><a class="bia uh_rl" href="/imgres?imgurl=http://www.alien-ufo-pictures.com/small_alien.jpg&amp;imgrefurl=http://www.alien-ufo-pictures.com/&amp;h=291&amp;w=420&amp;sz=11&amp;tbnid=k5_QbS7_y_2n8M:&amp;tbnh=98&amp;tbnw=142&amp;prev=/search%3Fq%3Dalien%2Bsightings%26tbm%3Disch%26tbo%3Du&amp;zoom=1&amp;q=alien+sightings&amp;docid=r4w7tT4gMj2ZJM&amp;hl=en&amp;sa=X&amp;ei=vFQwT9WLKsXotQaEsrWxBA&amp;sqi=2&amp;ved=0CEAQ9QEwAA" id="k5_QbS7_y_2n8M:" style="height:98px;margin-left:0px;margin-top:-7px;width:142px" tag="bia" ved="0CEEQ3hEwAA"><img src="data:image/jpeg;base64,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" alt="" align="middle" border="0" height="98" id="imgthumb1" class="th imgthumb1" title="http://www.alien-ufo-pictures.com/" style="margin:0px 0px 0px 0px" width="142"></a></li><!--n--><!--m--><li class="bili uh_r" style="height:90px;position:relative;width:66px"><a class="bia uh_rl" href="/imgres?imgurl=http://upload.wikimedia.org/wikipedia/commons/thumb/d/df/PurportedUFO2.jpg/220px-PurportedUFO2.jpg&amp;imgrefurl=http://en.wikipedia.org/wiki/List_of_UFO_sightings&amp;h=327&amp;w=220&amp;sz=21&amp;tbnid=A-jwvs6sKfUVDM:&amp;tbnh=98&amp;tbnw=66&amp;prev=/search%3Fq%3Dalien%2Bsightings%26tbm%3Disch%26tbo%3Du&amp;zoom=1&amp;q=alien+sightings&amp;docid=drZitz_ZHf43JM&amp;hl=en&amp;sa=X&amp;ei=vFQwT9WLKsXotQaEsrWxBA&amp;sqi=2&amp;ved=0CEQQ9QEwAQ" id="A-jwvs6sKfUVDM:" style="height:98px;margin-left:0px;margin-top:0px;width:66px" tag="bia" ved="0CEUQ3hEwAQ"><img src="data:image/jpeg;base64,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" alt="" align="middle" border="0" height="98" id="imgthumb2" class="th imgthumb2" title="http://en.wikipedia.org/wiki/List_of_UFO_sightings" style="margin:0px 0px 0px 0px" width="66"></a><button class="gbil esw eswd"   g:entity="image:A-jwvs6sKfUVDM" g:undo="poS1" title="Recommend this image" g:pingback="/gen_204?atyp=i&amp;ct=plusone&amp;cad=S1&amp;label=images_plusone" g:source="inline:images" g:imgtbn="http://t0.gstatic.com/images?q=tbn:ANd9GcQFbncY_BfpY9i8KsEYsQR0qfD3b1S8PH8Hn0bxdQufYFFWH8Dh" g:imgland="http://www.google.co.uk/imgres?imgurl=http://upload.wikimedia.org/wikipedia/commons/thumb/d/df/PurportedUFO2.jpg/220px-PurportedUFO2.jpg&amp;imgrefurl=http://en.wikipedia.org/wiki/List_of_UFO_sightings&amp;h=327&amp;w=220&amp;sz=21&amp;tbnid=A-jwvs6sKfUVDM:&amp;tbnh=98&amp;tbnw=66&amp;prev=/search%3Fq%3Dalien%2Bsightings%26tbm%3Disch%26tbo%3Du&amp;zoom=1&amp;q=alien+sightings&amp;docid=drZitz_ZHf43JM&amp;hl=en&amp;sa=X&amp;ei=vFQwT9WLKsXotQaEsrWxBA&amp;sqi=2&amp;ved=0CEQQ9QEwAQ" g:imgtitle="Image from en.wikipedia.org" id="gbpwm_26"></button></li><!--n--><!--m--><li class="bili uh_r" style="height:90px;position:relative;width:125px"><a class="bia uh_rl" href="/imgres?imgurl=http://thetruthbehindthescenes.files.wordpress.com/2010/09/accidental-alien-sighting-in-parque-forestal-chile.jpg&amp;imgrefurl=http://www.ufoevolution.com/forums/showthread.php%3Ft%3D7512&amp;h=375&amp;w=500&amp;sz=64&amp;tbnid=rVWzwpSthO8P1M:&amp;tbnh=94&amp;tbnw=125&amp;prev=/search%3Fq%3Dalien%2Bsightings%26tbm%3Disch%26tbo%3Du&amp;zoom=1&amp;q=alien+sightings&amp;docid=GEYQlLKybPrXmM&amp;hl=en&amp;sa=X&amp;ei=vFQwT9WLKsXotQaEsrWxBA&amp;sqi=2&amp;ved=0CEgQ9QEwAg" id="rVWzwpSthO8P1M:" style="height:94px;margin-left:0px;margin-top:0px;width:125px" tag="bia" ved="0CEkQ3hEwAg"><img src="data:image/jpeg;base64,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" alt="" align="middle" border="0" height="94" id="imgthumb3" class="th imgthumb3" title="http://www.ufoevolution.com/forums/showthread.php?t=7512" style="margin:0px 0px 0px 0px" width="125"></a><button class="gbil esw eswd"   g:entity="image:rVWzwpSthO8P1M" g:undo="poS2" title="Recommend this image" g:pingback="/gen_204?atyp=i&amp;ct=plusone&amp;cad=S2&amp;label=images_plusone" g:source="inline:images" g:imgtbn="http://t3.gstatic.com/images?q=tbn:ANd9GcSwh6G-1dU-BSZnphR_wodnx3Y6NotUotT2exofvdcVsnc2pdME" g:imgland="http://www.google.co.uk/imgres?imgurl=http://thetruthbehindthescenes.files.wordpress.com/2010/09/accidental-alien-sighting-in-parque-forestal-chile.jpg&amp;imgrefurl=http://www.ufoevolution.com/forums/showthread.php%3Ft%3D7512&amp;h=375&amp;w=500&amp;sz=64&amp;tbnid=rVWzwpSthO8P1M:&amp;tbnh=94&amp;tbnw=125&amp;prev=/search%3Fq%3Dalien%2Bsightings%26tbm%3Disch%26tbo%3Du&amp;zoom=1&amp;q=alien+sightings&amp;docid=GEYQlLKybPrXmM&amp;hl=en&amp;sa=X&amp;ei=vFQwT9WLKsXotQaEsrWxBA&amp;sqi=2&amp;ved=0CEgQ9QEwAg" g:imgtitle="Image from ufoevolution.com" id="gbpwm_27"></button></li><!--n--><!--m--><li class="bili bilir uh_r" style="height:90px;position:relative;width:153px"><a class="bia uh_rl" href="/imgres?imgurl=http://www.gstreetsightings.com/wp-content/uploads/2007/06/street-view-sightings-kid-alien.jpg&amp;imgrefurl=http://www.gstreetsightings.com/weird/kid-alien-google-street-view-sightings/&amp;h=249&amp;w=450&amp;sz=70&amp;tbnid=Y4HZNUaTuMVF4M:&amp;tbnh=90&amp;tbnw=163&amp;prev=/search%3Fq%3Dalien%2Bsightings%26tbm%3Disch%26tbo%3Du&amp;zoom=1&amp;q=alien+sightings&amp;docid=XgKFy0lckeICdM&amp;hl=en&amp;sa=X&amp;ei=vFQwT9WLKsXotQaEsrWxBA&amp;sqi=2&amp;ved=0CEwQ9QEwAw" id="Y4HZNUaTuMVF4M:" style="height:90px;margin-left:0px;margin-top:0px;width:163px" tag="bia" ved="0CE0Q3hEwAw"><img src="data:image/jpeg;base64,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" alt="" align="middle" border="0" height="90" id="imgthumb4" class="th imgthumb4" title="http://www.gstreetsightings.com/weird/kid-alien-google-street-view-sightings/" style="margin:0px 0px 0px 0px" width="163"></a><button class="gbil esw eswd"   g:entity="image:Y4HZNUaTuMVF4M" g:undo="poS3" title="Recommend this image" g:pingback="/gen_204?atyp=i&amp;ct=plusone&amp;cad=S3&amp;label=images_plusone" g:source="inline:images" g:imgtbn="http://t1.gstatic.com/images?q=tbn:ANd9GcQUI26E2j_BrUwhRTTMYix8fh084RM1F35xFNI2PAxNr68D5ybJ3g" g:imgland="http://www.google.co.uk/imgres?imgurl=http://www.gstreetsightings.com/wp-content/uploads/2007/06/street-view-sightings-kid-alien.jpg&amp;imgrefurl=http://www.gstreetsightings.com/weird/kid-alien-google-street-view-sightings/&amp;h=249&amp;w=450&amp;sz=70&amp;tbnid=Y4HZNUaTuMVF4M:&amp;tbnh=90&amp;tbnw=163&amp;prev=/search%3Fq%3Dalien%2Bsightings%26tbm%3Disch%26tbo%3Du&amp;zoom=1&amp;q=alien+sightings&amp;docid=XgKFy0lckeICdM&amp;hl=en&amp;sa=X&amp;ei=vFQwT9WLKsXotQaEsrWxBA&amp;sqi=2&amp;ved=0CEwQ9QEwAw" g:imgtitle="Image from gstreetsightings.com" id="gbpwm_28"></button></li><!--n--></ul></div></div></div><div class="esc slp" id="rg_img_wn" style="display:none">You +1\'d this publicly.</div><div class="rg_ils" id="isr_soa" style="display:none;width:100%"><div class="so f" style="position:static;z-index:10"><div class="so_text"><span class="son" style="position:static">You</span></div></div></div><div id="rg_h" class="uh_h" style="left:164px;top:149px;width:270px;"><div class="uh_hc" style="height:100%;overflow:hidden;width:100%"><div style="position:relative"><a class="uh_hl" id="rg_hl" style="outline:none" href="http://www.google.co.uk/imgres?imgurl=http://www.alien-ufo-pictures.com/small_alien.jpg&amp;imgrefurl=http://www.alien-ufo-pictures.com/&amp;h=291&amp;w=420&amp;sz=11&amp;tbnid=k5_QbS7_y_2n8M:&amp;tbnh=98&amp;tbnw=142&amp;prev=/search%3Fq%3Dalien%2Bsightings%26tbm%3Disch%26tbo%3Du&amp;zoom=1&amp;q=alien+sightings&amp;docid=r4w7tT4gMj2ZJM&amp;hl=en&amp;sa=X&amp;ei=vFQwT9WLKsXotQaEsrWxBA&amp;sqi=2&amp;ved=0CEAQ9QEwAA"><img class="uh_hi" id="rg_hi" alt="" src="http://t0.gstatic.com/images?q=tbn:ANd9GcR-mutg78hgPLV2WixFMWvMPyFQvmfGFtKlB-NRuBxG_Fa93U4G" width="270" height="187" data-width="270" data-height="187" style="width:270px;height:187px"><span class="rg_ilbg" id="rg_ilbg" style="bottom:1px"></span><span class="rg_il" id="rg_il" style="bottom:1px"></span></a></div><div class="std" id="rg_hx"><p class="uh_ht" id="rg_ht" style="max-height: 2.4em; "><a id="rg_hta" href="http://www.google.co.uk/imgres?imgurl=http://www.alien-ufo-pictures.com/small_alien.jpg&amp;imgrefurl=http://www.alien-ufo-pictures.com/&amp;h=291&amp;w=420&amp;sz=11&amp;tbnid=k5_QbS7_y_2n8M:&amp;tbnh=98&amp;tbnw=142&amp;prev=/search%3Fq%3Dalien%2Bsightings%26tbm%3Disch%26tbo%3Du&amp;zoom=1&amp;q=alien+sightings&amp;docid=r4w7tT4gMj2ZJM&amp;hl=en&amp;sa=X&amp;ei=vFQwT9WLKsXotQaEsrWxBA&amp;sqi=2&amp;ved=0CEAQ9QEwAA">small_alien.jpg</a><button class="gbil esw eswd"   g:entity="image:k5_QbS7_y_2n8M" g:undo="poS0" title="Recommend this image" g:pingback="/gen_204?atyp=i&amp;ct=plusone&amp;cad=S0&amp;label=images_plusone" g:source="inline:images" g:imgtbn="http://t0.gstatic.com/images?q=tbn:ANd9GcR-mutg78hgPLV2WixFMWvMPyFQvmfGFtKlB-NRuBxG_Fa93U4G" g:imgland="http://www.google.co.uk/imgres?imgurl=http://www.alien-ufo-pictures.com/small_alien.jpg&amp;imgrefurl=http://www.alien-ufo-pictures.com/&amp;h=291&amp;w=420&amp;sz=11&amp;tbnid=k5_QbS7_y_2n8M:&amp;tbnh=98&amp;tbnw=142&amp;prev=/search%3Fq%3Dalien%2Bsightings%26tbm%3Disch%26tbo%3Du&amp;zoom=1&amp;q=alien+sightings&amp;docid=r4w7tT4gMj2ZJM&amp;hl=en&amp;sa=X&amp;ei=vFQwT9WLKsXotQaEsrWxBA&amp;sqi=2&amp;ved=0CEAQ9QEwAA" g:imgtitle="Image from alien-ufo-pictures.com" id="gbpwm_29"></button></p><p class="uh_hr kv"><span id="rg_hr" style="height:0">alien-ufo-pictures.com</span></p><div id="rg_pos"><div class="esc slp" id="poS0" style="display:none">You +1\'d this publicly.</div></div><p class="uh_hn st" id="rg_hn"><div>420&nbsp;×&nbsp;291&nbsp;-&nbsp;To view the <span style="font-weight: bold; ">alien</span> photos in their full size click on the images. <span style="font-weight: bold; ">alien</span>. On October first of 2002, while vacationing in the Southern Chilean city of <span style="font-weight: bold; ">...</span></div></p><div id="rg_hs" style="display: none; "></div><p class="uh_ha osl" style="margin-bottom:0" id="uh_ha_osl"><span id="rg_ha"><a class="uh_hal" id="rg_hals" href="/search?q=alien+sightings&amp;hl=en&amp;biw=1440&amp;bih=702&amp;prmd=imvns&amp;tbm=isch&amp;tbs=simg:CAESEgmTn9BtLv_1L_1SGvjDu1PiAyPQ">Similar</a><span id="rg_has">&nbsp;‑&nbsp;</span><a class="uh_hal" id="rg_haln" href="/search?q=alien+sightings&amp;hl=en&amp;biw=1440&amp;bih=702&amp;prmd=imvns&amp;tbm=isch&amp;tbs=simg:CAQSEgmTn9BtLv_1L_1SGvjDu1PiAyPQ">More sizes</a></span></p></div></div></div><!--m--></li></ol>   </div>';
    return html;
  };
});