import * as React from 'react';
import {Text} from 'react-native';
import Colors from "../domain/Colors";

export function TextFg(props: any) {
  return <Text {...props} style={[props.style, {color: Colors.colorfg}]} />;
}
