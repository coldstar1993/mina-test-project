import {
  AccountUpdate,
  AccountUpdateForest,
  assert,
  Bool,
  DeployArgs,
  Field,
  method,
  Permissions,
  Poseidon,
  Provable,
  PublicKey,
  SmartContract,
  State,
  state,
  TokenContract,
  UInt64,
  VerificationKey,
} from 'o1js';
import { NoriStorageInterface } from './NoriStorageInterface.js';

export interface NoriTokenControllerDeployProps
  extends Exclude<DeployArgs, undefined> {
  access: any,
}

export class NoriTokenController extends TokenContract {
  @state(Field) storageVKHash = State<Field>();

  async deploy(args: NoriTokenControllerDeployProps) {
    await super.deploy(args);

    this.account.permissions.set({
      ...Permissions.default(),
      setVerificationKey:
        Permissions.VerificationKey.impossibleDuringCurrentVersion(),
      setPermissions: Permissions.impossible(),
      editState: Permissions.proof(),
      send: Permissions.proof(),
      access: args?.access ?? Permissions.none(),
    });
  }

  approveBase(forest: AccountUpdateForest): Promise<void> {
    throw new Error('Method not implemented.');
  }

  @method public async setUpStorage(user: PublicKey, vk: VerificationKey) {
    let tokenAccUpdate = AccountUpdate.createSigned(
      user,
      this.deriveTokenId()
    );
    // TODO: what if someone sent token to this address before?
    tokenAccUpdate.account.isNew.requireEquals(Bool(true));

    // could use the idea of vkMap from latest standard
    const storageVKHash = this.storageVKHash.getAndRequireEquals();
    storageVKHash.assertEquals(vk.hash);
    tokenAccUpdate.body.update.verificationKey = {
      isSome: Bool(true),
      value: vk,
    };
    tokenAccUpdate.body.update.permissions = {
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
      tokenAccUpdate.update.appState[0], //NoriStorageInterface.mintedSoFar
      Field(0)
    );
  }

  @method public async noriMint(amountToMint: Field) {
    const userAddress = this.sender.getUnconstrained(); //TODO make user pass signature due to limit of AU

    let storageInterface = new NoriStorageInterface(userAddress, this.deriveTokenId());

    await storageInterface.increaseMintedAmount(amountToMint);
  }
}
