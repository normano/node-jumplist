import JumpList from "@exscn/jumplist";

let list = new JumpList();
list.set("a", 5);
list.set("b", 6);
list.set("c", 8);
list.set("d", 9);
list.get("b");
>>> 6 

list.remove("a");
list.get("a");
>>> undefined

list.range("c", "e", (key, value) => {
  console.info("=", key, value);
});
>> = c 8
>> = d 9

list.getAt(0);
>> {key: "b", value: 6}

list.getAt(2);
>> {key: "d", value: 9}

list.rangeUpper("b", (key, value) => {
  console.info("=", key, value);
});
>> = b 6
>> = c 8
>> = d 9