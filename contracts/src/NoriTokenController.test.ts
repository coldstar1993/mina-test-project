import { AccountUpdate, Bool, Field, Mina, PrivateKey, PublicKey, VerificationKey, Permissions, UInt64 } from 'o1js';
import { describe, it, before, beforeEach } from 'node:test';
import { NoriTokenController, NoriTokenControllerDeployProps } from './NoriTokenController.js';
import { NoriStorageInterface } from './NoriStorageInterface.js';
import assert from 'node:assert';

const proofsEnabled = true;

describe('NoriTokenController', () => {
  let deployerAccount: Mina.TestPublicKey,
    deployerKey: PrivateKey,
    senderAccount: Mina.TestPublicKey,
    senderKey: PrivateKey,
    aliceAccount: Mina.TestPublicKey,
    aliceKey: PrivateKey,
    bobAccount: Mina.TestPublicKey,
    bobKey: PrivateKey,

    noriTokenControllerAddress: PublicKey,
    noriTokenControllerPrivateKey: PrivateKey,
    noriTokenController: NoriTokenController,

    storageVK: VerificationKey;

  before(async () => {
    if (proofsEnabled) {
      await NoriStorageInterface.compile();
      console.log('NoriStorageInterface compiled...');
      storageVK = (await NoriTokenController.compile()).verificationKey;
      console.log('NoriTokenController compiled...');
    }
  });

  beforeEach(async () => {
    const Local = await Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    [deployerAccount, senderAccount, aliceAccount, bobAccount] = Local.testAccounts;
    deployerKey = deployerAccount.key;
    senderKey = senderAccount.key;
    aliceKey = aliceAccount.key;
    bobKey = bobAccount.key;

    noriTokenControllerPrivateKey = PrivateKey.random();
    noriTokenControllerAddress = noriTokenControllerPrivateKey.toPublicKey();
    noriTokenController = new NoriTokenController(noriTokenControllerAddress);

  });

  async function localDeploy(noriTokenControllerDeployProps: NoriTokenControllerDeployProps) {
    const txn = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      await noriTokenController.deploy(noriTokenControllerDeployProps);
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, noriTokenControllerPrivateKey]).send();
  }

  it('test evil creation of storage contract with invalid permissions without approval from noriTokenController', async () => {
    const noriTokenControllerDeployProps: NoriTokenControllerDeployProps = {
      access: Permissions.none(),
    };
    await localDeploy(noriTokenControllerDeployProps);

    const tokenId = noriTokenController.deriveTokenId();

    await assert.rejects(async () => {
      const txn = await Mina.transaction(senderAccount, async () => {
        AccountUpdate.fundNewAccount(aliceAccount);

        let aliceAccUpdate = AccountUpdate.createSigned(
          aliceAccount,
          tokenId
        );

        // could use the idea of vkMap from latest standard
        aliceAccUpdate.body.update.verificationKey = {
          isSome: Bool(true),
          value: storageVK,
        };
        aliceAccUpdate.body.update.permissions = {
          isSome: Bool(true),
          value: {
            ...Permissions.default(),
            editState: Permissions.proof(),
            // VK upgradability here?
            setVerificationKey:
              Permissions.VerificationKey.impossibleDuringCurrentVersion(),
            setPermissions: Permissions.proof(), //imposible?
          },
        };

        AccountUpdate.setValue(
          aliceAccUpdate.update.appState[0], //NoriStorageInterface.mintedSoFar
          Field(0)
        );

        //const noriTokenControllerUpdate = AccountUpdate.createSigned(noriTokenControllerAddress);
        //noriTokenControllerUpdate.approve(aliceAccUpdate);
      });
      await txn.prove();
      await txn.sign([aliceKey, senderKey, noriTokenControllerPrivateKey]).send();
    });
  });

  it('test evil noriController(access: signature) private key holder sign approval to creation of storage contract with invalid permissions', async () => {
    const noriTokenControllerDeployProps: NoriTokenControllerDeployProps = {
      access: Permissions.signature(),
    };
    await localDeploy(noriTokenControllerDeployProps);

    const tokenId = noriTokenController.deriveTokenId();
    // settleState transaction
    const txn = await Mina.transaction(senderAccount, async () => {
      AccountUpdate.fundNewAccount(aliceAccount);

      let aliceAccUpdate = AccountUpdate.createSigned(
        aliceAccount,
        tokenId
      );

      // could use the idea of vkMap from latest standard
      aliceAccUpdate.body.update.verificationKey = {
        isSome: Bool(true),
        value: storageVK,
      };
      aliceAccUpdate.body.update.permissions = {
        isSome: Bool(true),
        value: {
          ...Permissions.default(),
          editState: Permissions.proof(),
          // VK upgradability here?
          setVerificationKey:
            Permissions.VerificationKey.impossibleDuringCurrentVersion(),
          setPermissions: Permissions.proof(), //imposible?
        },
      };

      AccountUpdate.setValue(
        aliceAccUpdate.update.appState[0], //NoriStorageInterface.mintedSoFar
        Field(0)
      );

      const noriTokenControllerUpdate = AccountUpdate.createSigned(noriTokenControllerAddress);
      noriTokenControllerUpdate.approve(aliceAccUpdate);
    });
    await txn.prove();
    await txn.sign([aliceKey, senderKey, noriTokenControllerPrivateKey]).send();
  });

  it('test evil noriController(access: proof) private key holder sign approval to creation of storage contract with invalid permissions', async () => {
    const noriTokenControllerDeployProps: NoriTokenControllerDeployProps = {
      access: Permissions.proof(),
    };
    await localDeploy(noriTokenControllerDeployProps);

    const tokenId = noriTokenController.deriveTokenId();

    await assert.rejects(async () => {
      // settleState transaction
      const txn = await Mina.transaction(senderAccount, async () => {
        AccountUpdate.fundNewAccount(aliceAccount);

        let aliceAccUpdate = AccountUpdate.createSigned(
          aliceAccount,
          tokenId
        );

        // could use the idea of vkMap from latest standard
        aliceAccUpdate.body.update.verificationKey = {
          isSome: Bool(true),
          value: storageVK,
        };
        aliceAccUpdate.body.update.permissions = {
          isSome: Bool(true),
          value: {
            ...Permissions.default(),
            editState: Permissions.proof(),
            // VK upgradability here?
            setVerificationKey:
              Permissions.VerificationKey.impossibleDuringCurrentVersion(),
            setPermissions: Permissions.proof(), //imposible?
          },
        };

        AccountUpdate.setValue(
          aliceAccUpdate.update.appState[0], //NoriStorageInterface.mintedSoFar
          Field(0)
        );

        const noriTokenControllerUpdate = AccountUpdate.createSigned(noriTokenControllerAddress);
        noriTokenControllerUpdate.approve(aliceAccUpdate);
      });
      await txn.prove();
      await txn.sign([aliceKey, senderKey, noriTokenControllerPrivateKey]).send();
    })
  });

  it('test evil simply read state from noriController(access: none)', async () => {
    const noriTokenControllerDeployProps: NoriTokenControllerDeployProps = {
      access: Permissions.none(),
    };
    await localDeploy(noriTokenControllerDeployProps);
    // settleState transaction
    const txn = await Mina.transaction(senderAccount, async () => {
      const noriTokenControllerUpdate = AccountUpdate.create(noriTokenControllerAddress);
      noriTokenControllerUpdate.account.balance.requireBetween(new UInt64(0), new UInt64(2 * 10e9));
    });
    // await txn.prove();
    await txn.sign([senderKey]).send();
  });

  it('test simply read state from noriController(access: signature)', async () => {
    const noriTokenControllerDeployProps: NoriTokenControllerDeployProps = {
      access: Permissions.signature(),
    };
    await localDeploy(noriTokenControllerDeployProps);

    await assert.rejects(async () => {
      try {
        // settleState transaction
        const txn = await Mina.transaction(senderAccount, async () => {
          const noriTokenControllerUpdate = AccountUpdate.create(noriTokenControllerAddress);
          noriTokenControllerUpdate.account.balance.requireBetween(new UInt64(0), new UInt64(2 * 10e9));
        });
        // await txn.prove();
        await txn.sign([senderKey]).send();
      } catch (error) {
        console.log('--------------------------------');
        console.log('The below error is thrown from [unit test - simply read state from noriController(access: signature)]:');
        console.log(error);
        console.log('--------------------------------\n');
        throw error;
      }
    })
  });


  it('test simply read state from noriController(access: proof)', async () => {
    const noriTokenControllerDeployProps: NoriTokenControllerDeployProps = {
      access: Permissions.proof(),
    };
    await localDeploy(noriTokenControllerDeployProps);

    await assert.rejects(async () => {
      try {
        // settleState transaction
        const txn = await Mina.transaction(senderAccount, async () => {
          const noriTokenControllerUpdate = AccountUpdate.create(noriTokenControllerAddress);
          noriTokenControllerUpdate.account.balance.requireBetween(new UInt64(0), new UInt64(2 * 10e9));
        });
        // await txn.prove();
        await txn.sign([senderKey]).send();
      } catch (error) {
        console.log('--------------------------------');
        console.log('The below error is thrown from [unit test - simply read state from noriController(access: proof)]:');
        console.log(error);
        console.log('--------------------------------\n');
        throw error;
      }
    })
  });


});
