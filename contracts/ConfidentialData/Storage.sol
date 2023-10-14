// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract Storage {
    struct Animal {
        string name;
        uint256 age;
        uint128 weight;
        uint128 height;
        string blood;
    }

    uint256 one = 1;
    uint32 two = 2;
    uint32 three = 3;
    uint16 four = 4;
    uint16 five = 5;
    uint256 six = 6;
    uint256[3] public animalArray = [10, 20, 30];

    Animal[] public animalDynamic;
    mapping(uint256 => Animal) public animalMapping;

    event AddAnimalDynamic(
        string name,
        uint256 age,
        uint128 weight,
        uint128 height,
        string blood
    );
    event AddAnimalMapping(
        string name,
        uint256 age,
        uint128 weight,
        uint128 height,
        string blood
    );

    constructor() {
        Animal memory cat = Animal("cat", 1, 10, 20, "A");
        Animal memory dog = Animal("dog", 2, 30, 40, "B");
        Animal memory bear = Animal("bear", 3, 50, 60, "AB");

        // dynamic
        animalDynamic.push(cat);
        animalDynamic.push(dog);
        animalDynamic.push(bear);

        // mapping
        animalMapping[0] = cat;
        animalMapping[1] = dog;
        animalMapping[2] = bear;
    }

    function addAnimalDynamic(
        string memory _name,
        uint256 _age,
        uint128 _weight,
        uint128 _height,
        string memory _blood
    ) external {
        Animal memory animal = Animal(_name, _age, _weight, _height, _blood);
        animalDynamic.push(animal);
        emit AddAnimalDynamic(_name, _age, _weight, _height, _blood);
    }

    function addAnimalMapping(
        uint256 _index,
        string memory _name,
        uint256 _age,
        uint128 _weight,
        uint128 _height,
        string memory _blood
    ) external {
        Animal memory animal = Animal(_name, _age, _weight, _height, _blood);
        animalMapping[_index] = animal;
        emit AddAnimalMapping(_name, _age, _weight, _height, _blood);
    }

    function getAnimalDynamicName(
        uint256 _index
    ) external view returns (string memory) {
        return animalDynamic[_index].name;
    }

    function getAnimalMappingName(
        uint256 _index
    ) external view returns (string memory) {
        return animalMapping[_index].name;
    }
}
