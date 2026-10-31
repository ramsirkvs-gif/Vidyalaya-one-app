const key=new URLSearchParams(location.search).get('student');location.replace('cbse-mission.html'+(key?'#'+new URLSearchParams({student:key,comment:'1'}).toString():''));
