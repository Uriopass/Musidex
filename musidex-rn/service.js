import TrackPlayer from 'react-native-track-player';
// service.js
module.exports = async function () {
    TrackPlayer.addEventListener('remote-play', () => TrackPlayer.play());
    TrackPlayer.addEventListener('remote-pause', () => TrackPlayer.pause());
    TrackPlayer.addEventListener('remote-stop', () => TrackPlayer.destroy());
    TrackPlayer.addEventListener('remote-next', () => {});
    TrackPlayer.addEventListener('remote-jump-forward', () => {
        TrackPlayer.getPosition().then((position) => TrackPlayer.seekTo(position + 10))
    });
}