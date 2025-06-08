This repository contains a TypeScript + Node.js implementation of **Geocryptark**, a proof-of-concept to validate and demonstrate the ideas proposed in the paper.

It showcases a decentralized cryptographic mechanism where access to data is tied to geographic coordinates and a common password — enabling location-based encryption without relying on trusted third parties.

---

**Full paper available in PDF in the following languages:**

- [Portuguese](docs/Geocryptark.pt.pdf)
- [English](docs/Geocryptark.en.pdf)

---

# Exemple
### Inputs:

-   $\mathit{O}$: data to store in the vault.

-   $\mathit{L}_i = (\mathit{lat}, \mathit{lng})$: one or more points on
    the map.

-   $P$: common password (analogous to the vault key).

-   $\mathit{salt}$: value to increase entropy.


```js
const testData = 'test data';
const testPassword = 'test password';
const testSalt = 'test salt';
const testCoords = [
    { lat: 40.7128, lng: -74.0060 }, // New York
    { lat: 51.5074, lng: -0.1278 }  // London
];
```

### Result:

```json
{
  "salt": "test salt",
  "data": "DgPQ70NEUomeqqC/2W30ikpcV1JxjvimpHAV0wYe845VQpT7WS61a6g=",
  "iv": "O2hWELqQLHD6aK8v",
  "keys": [
    {
      "wrappedKey": "swk9BR/dRjX3hzeHPhHOYImLdhu2atrmz26o7vM7I4TEs33qTYJvLQf88/Fu8ViK",
      "keyIv": "cOz1CuGOY7ep2Z4x"
    },
    {
      "wrappedKey": "9rapBvcLNgP+P0Dpbh3FgFtgCCsY8o5Kj8Ojq4Dn/PAJTfu9vpXdlQ6DqBgzTbVn",
      "keyIv": "svNTiwBPURqkDc6W"
    }
  ]
}
```

