import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:summons_viewer/main.dart';

void main() {
  testWidgets('App renders SummonMitra branding', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const SummonMitraApp());
    await tester.pump(const Duration(seconds: 1));
    expect(find.text('SummonMitra'), findsWidgets);
  });
}
