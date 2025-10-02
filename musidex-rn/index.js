/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import TrackPlayer from "react-native-track-player";
import 'react-native-gesture-handler';

AppRegistry.registerComponent("Musidex", () => App);
TrackPlayer.registerPlaybackService(() => require('./service'));
