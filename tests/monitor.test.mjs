import test from 'node:test';
import assert from 'node:assert/strict';
import {pointState,matchesPointFilter} from '../public/monitor-utils.js';

test('monitoramento diferencia vínculo, presença, publicação e reprodução',()=>{
 const playing={paired:true,online:true,publishedVersion:1,playbackState:'playing',currentMedia:{id:'a'}};
 assert.equal(pointState(playing).key,'playing');
 assert.equal(pointState({...playing,online:false}).key,'offline');
 assert.equal(pointState({...playing,paired:false}).key,'unpaired');
 assert.equal(pointState({...playing,publishedVersion:0}).key,'no_playlist');
 assert.equal(pointState({...playing,playbackState:'error'}).key,'error');
 assert.equal(pointState({...playing,currentMedia:null}).key,'waiting');
 assert.equal(matchesPointFilter(playing,'playing'),true);
 assert.equal(matchesPointFilter({...playing,online:false},'playing'),false);
 assert.equal(matchesPointFilter({...playing,paired:false,online:false},'offline'),true);
 assert.equal(matchesPointFilter(playing,'all'),true);
});
